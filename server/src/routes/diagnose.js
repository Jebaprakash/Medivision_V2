/**
 * Diagnosis route — full production implementation.
 *
 * Architecture:
 * React Frontend → POST /api/diagnose → Node.js (this route)
 *                                     → Java Spring Boot Vision Service → Gemini Vision API
 *                                     → PostgreSQL (saves full diagnosis)
 *
 * Features:
 *  - Health check before forwarding
 *  - 3x retry with exponential backoff (2s, 4s)
 *  - Saves complete diagnosis (disease_name, severity, confidence, image_url) to DB
 *  - Emergency classification for dangerous conditions
 *  - Serves DB medicines for known diseases
 */
const express = require('express');
const axios   = require('axios');
const fs      = require('fs');
const FormData = require('form-data');
const pool    = require('../db');
const upload  = require('../middleware/upload');
const authMiddleware = require('../middleware/auth');
const { classifySeverity } = require('../services/emergencyService');

const router = express.Router();

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:5002';
const MEDICAL_DISCLAIMER =
    'This system provides preliminary health information and should not replace professional medical advice. ' +
    'Always consult a qualified healthcare provider for accurate diagnosis and treatment.';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkVisionServiceHealth() {
    try {
        const res = await axios.get(`${VISION_SERVICE_URL}/health`, { timeout: 3000 });
        return res.status === 200;
    } catch {
        return false;
    }
}

// ----------------------------------------------------------------
// POST /api/diagnose
// ----------------------------------------------------------------
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] POST /api/diagnose — User: ${req.user.id}`);

    try {
        // 1. Validate image upload
        if (!req.file) {
            return res.status(400).json({ error: true, message: 'Please upload a medical image (JPG, PNG, or WebP).' });
        }
        console.log(`[Diagnose] Image: ${req.file.filename} (${Math.round(req.file.size / 1024)} KB)`);

        const symptoms = req.body.symptoms || '';

        // 2. Health check
        const isUp = await checkVisionServiceHealth();
        if (!isUp) {
            console.warn('[Diagnose] Vision service unreachable');
            return res.status(502).json({ error: 'AI service temporarily unavailable. Please try again in a moment.' });
        }

        // 3. Forward to AI microservice with retry
        const formData = new FormData();
        formData.append('image', fs.createReadStream(req.file.path), {
            filename: req.file.filename,
            contentType: req.file.mimetype,
        });
        formData.append('symptoms', symptoms);

        let aiResult = null;
        const maxRetries = 2;

        for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
            try {
                console.log(`[Diagnose] AI API call attempt ${attempt}/${maxRetries + 1}`);

                const response = await axios.post(`${VISION_SERVICE_URL}/analyze`, formData, {
                    headers: { ...formData.getHeaders() },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 60000,
                });
                aiResult = response.data;
                console.log(`[Diagnose] AI response received in ${Date.now() - startTime}ms`);
                break;

            } catch (apiErr) {
                console.error(`[Diagnose] AI attempt ${attempt} failed:`, apiErr.message);
                if (attempt <= maxRetries) {
                    const backoff = attempt * 2000;
                    console.log(`[Diagnose] Retrying in ${backoff}ms...`);
                    await sleep(backoff);
                } else {
                    console.error('[Diagnose] All AI retries exhausted');
                    return res.status(502).json({ error: 'AI analysis failed after multiple retries. Please try again.' });
                }
            }
        }

        if (!aiResult) {
            return res.status(502).json({ error: 'AI service did not return a result.' });
        }

        // 4. Parse AI response fields (handle both naming schemas from Java service)
        const condition       = aiResult.disease || aiResult.condition || 'Unidentified';
        const confidence      = parseFloat(aiResult.confidence || aiResult.confidence_score || 0);
        const severity        = (aiResult.severity || 'mild').toLowerCase();
        const description     = aiResult.description || 'No description provided.';
        const precautions     = aiResult.precautions || [];
        const possibleCauses  = aiResult.possible_causes || aiResult.possibleCauses || [];
        const aiMedicines     = aiResult.recommended_medicines || aiResult.recommendedMedicines || [];
        const doctorRequired  = aiResult.doctor_required !== undefined ? aiResult.doctor_required : true;
        const lowConfidence   = confidence < 0.50;

        console.log(`[Diagnose] Condition: ${condition} | Confidence: ${(confidence * 100).toFixed(1)}% | Severity: ${severity}`);

        // 5. Emergency classification
        const emergency = classifySeverity(condition, confidence);

        // 6. Database: find or create disease record
        let diseaseId = null;
        if (condition && condition !== 'Unidentified' && condition !== 'Not a skin image') {
            try {
                const existing = await pool.query(
                    'SELECT id FROM diseases WHERE LOWER(name) = LOWER($1)', [condition]
                );
                if (existing.rows.length > 0) {
                    diseaseId = existing.rows[0].id;
                } else {
                    const severityMapped = ['mild', 'moderate', 'severe'].includes(severity) ? severity : 'mild';
                    const inserted = await pool.query(
                        'INSERT INTO diseases (name, severity, precautions, description) VALUES ($1, $2::severity_level, $3, $4) RETURNING id',
                        [condition, severityMapped, precautions, description]
                    );
                    diseaseId = inserted.rows[0].id;
                }
            } catch (dbErr) {
                console.error('[Diagnose] Disease lookup/insert error:', dbErr.message);
            }
        }

        // 7. Save diagnosis to history (with full fields)
        const imageUrl = `/uploads/${req.file.filename}`;
        const symptomArray = symptoms
            ? symptoms.split(',').map(s => s.trim()).filter(Boolean)
            : [];

        try {
            // Check which columns exist to handle both schema versions
            await pool.query(
                `INSERT INTO diagnosis_history
                    (user_id, disease_id, confidence_score, image_url, symptoms)
                 VALUES ($1, $2, $3, $4, $5)`,
                [req.user.id, diseaseId, confidence, imageUrl, symptomArray]
            );
            console.log('[Diagnose] Saved to diagnosis_history');
        } catch (dbErr) {
            console.error('[Diagnose] Failed to save diagnosis history:', dbErr.message);
        }

        // 8. Fetch DB medicines for known disease
        let dbMedicines = [];
        if (diseaseId) {
            try {
                const medResult = await pool.query(
                    'SELECT name, dosage, notes FROM medicines WHERE disease_id = $1',
                    [diseaseId]
                );
                dbMedicines = medResult.rows;
            } catch (dbErr) {
                console.error('[Diagnose] Failed to fetch medicines:', dbErr.message);
            }
        }

        const finalMedicines = dbMedicines.length > 0
            ? dbMedicines
            : aiMedicines.map(m => ({ name: m }));

        console.log(`[Diagnose] Completed in ${Date.now() - startTime}ms`);

        // 9. Return response
        return res.json({
            diagnosis: {
                condition,
                confidence_score: confidence,
                severity,
                description,
                precautions,
                possible_causes: possibleCauses,
                doctor_required: doctorRequired,
                low_confidence: lowConfidence,
                medicines: finalMedicines,
                image_url: imageUrl,
            },
            emergency: {
                isEmergency:      emergency.isEmergency,
                alertMessage:     emergency.alertMessage,
                recommendedAction: emergency.recommendedAction,
            },
            disclaimer: MEDICAL_DISCLAIMER,
        });

    } catch (err) {
        console.error(`[Diagnose] Fatal error:`, err.message, err.stack);
        return res.status(500).json({ error: 'Internal server error during diagnosis.' });
    }
});

module.exports = router;
