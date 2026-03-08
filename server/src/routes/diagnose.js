/**
 * Diagnosis route — receives image + symptoms from the client,
 * handles retries and logging, forwards to the AI Vision microservice,
 * saves the result to PostgreSQL, and returns the full diagnosis.
 */
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const pool = require('../db');
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/auth');
const { classifySeverity } = require('../services/emergencyService');

const router = express.Router();

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:5002';
const MEDICAL_DISCLAIMER =
    'This system provides preliminary health information and should not replace professional medical advice. Always consult a qualified healthcare provider for accurate diagnosis and treatment.';

// Utility function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if the AI Microservice is alive before forwarding requests
 */
async function checkVisionServiceHealth() {
    try {
        const res = await axios.get(`${VISION_SERVICE_URL}/health`, { timeout: 3000 });
        if (res.status === 200 && res.data.status) {
            return true;
        }
        return false;
    } catch (err) {
        return false;
    }
}

// ----------------------------------------------------------------
// POST /api/diagnose
// ----------------------------------------------------------------
router.post('/', authMiddleware, upload.single('image'), async (req, res) => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] POST /api/diagnose request received for User ID: ${req.user.id}`);

    try {
        // ---- Check Image Upload Status ----
        if (!req.file) {
            console.log(`[${new Date().toISOString()}] Image upload status: Failed - No file provided.`);
            return res.status(400).json({ error: true, message: 'Please upload a medical image (JPG, PNG, or WebP).' });
        }
        console.log(`[${new Date().toISOString()}] Image upload status: Success - ${req.file.filename} (${Math.round(req.file.size / 1024)} KB)`);

        const symptoms = req.body.symptoms || '';

        // ---- Step 1: Microservice Health Check ----
        const isAiServiceUp = await checkVisionServiceHealth();
        if (!isAiServiceUp) {
            console.log(`[${new Date().toISOString()}] Health check failed. Vision service at ${VISION_SERVICE_URL} is unreachable.`);
            return res.status(502).json({ error: "AI service temporarily unavailable" });
        }
        console.log(`[${new Date().toISOString()}] Health check passed. Vision service is running.`);

        // ---- Step 2: Forward Request with Retry/Timeout Logic ----
        const formData = new FormData();
        formData.append('image', fs.createReadStream(req.file.path), {
            filename: req.file.filename,
            contentType: req.file.mimetype,
        });
        formData.append('symptoms', symptoms);

        let aiResult = null;
        let attempts = 0;
        const maxRetries = 2; // total 3 attempts

        while (attempts <= maxRetries && !aiResult) {
            try {
                attempts++;
                console.log(`[${new Date().toISOString()}] Attempting AI API call (Attempt ${attempts}/${maxRetries + 1})...`);
                
                const response = await axios.post(`${VISION_SERVICE_URL}/analyze`, formData, {
                    headers: { ...formData.getHeaders() },
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity,
                    timeout: 45000, 
                });
                aiResult = response.data;
                console.log(`[${new Date().toISOString()}] AI API response successful in ${Date.now() - startTime}ms.`);
            } catch (apiErr) {
                console.error(`[${new Date().toISOString()}] AI API attempt ${attempts} failed:`, apiErr.message);
                
                if (attempts <= maxRetries) {
                    console.log(`[${new Date().toISOString()}] Retrying in 2 seconds...`);
                    await sleep(2000); // 2 second backoff
                } else {
                    console.error(`[${new Date().toISOString()}] All AI API retries exhausted.`);
                    return res.status(502).json({ error: "AI service temporarily unavailable" });
                }
            }
        }

        // Handle case where we didn't crash but aiResult is empty
        if (!aiResult) {
            return res.status(502).json({ error: "AI service temporarily unavailable" });
        }

        // ---- Step 3: Handle Final AI Response & Emergency Status ----
        const condition = aiResult.disease || aiResult.condition || "Unidentified"; // handle both naming schemas
        const confidence = aiResult.confidence || aiResult.confidence_score || 0.0;
        const severity = aiResult.severity || "none";
        const description = aiResult.description || "No description provided.";
        const precautions = aiResult.precautions || aiResult.recommendations || [];
        // Extract AI medicines, but keep DB medicines logic intact below
        const recommendedMedicines = aiResult.recommended_medicines || aiResult.recommendedMedicines || [];
        
        // As requested: ensure low confidence triggers appropriately
        const lowConfidence = confidence < 0.50;

        console.log(`[${new Date().toISOString()}] AI Result extracted - Disease: ${condition}, Confidence: ${confidence}, Severity: ${severity}`);

        const emergencyResult = classifySeverity(condition, confidence);

        // ---- Step 4: Look up or insert disease in the database ----
        let diseaseId = null;
        if (condition && condition !== 'Unidentified') {
            const diseaseResult = await pool.query('SELECT id FROM diseases WHERE LOWER(name) = LOWER($1)', [condition]);

            if (diseaseResult.rows.length > 0) {
                diseaseId = diseaseResult.rows[0].id;
            } else {
                try {
                    const insertResult = await pool.query(
                        'INSERT INTO diseases (name, severity, precautions) VALUES ($1, $2, $3) RETURNING id',
                        [condition, severity || 'mild', precautions]
                    );
                    diseaseId = insertResult.rows[0].id;
                } catch (dbErr) {
                    console.error(`[${new Date().toISOString()}] Failed to insert novel disease:`, dbErr.message);
                }
            }
        }

        // ---- Step 5: Save diagnosis to history ----
        const imageUrl = `/uploads/${req.file.filename}`;
        const symptomArray = symptoms ? symptoms.split(',').map((s) => s.trim()).filter(Boolean) : [];

        try {
            await pool.query(
                `INSERT INTO diagnosis_history (user_id, disease_id, confidence_score, image_url, symptoms, prediction, severity_text, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 'initial')`,
                [req.user.id, diseaseId, confidence, imageUrl, symptomArray, condition, emergencyResult.severity]
            );
        } catch (dbErr) {
            console.error(`[${new Date().toISOString()}] Failed to insert diagnosis history:`, dbErr.message);
        }

        // ---- Step 6: Fetch recommended medicines if disease is known ----
        let medicines = [];
        if (diseaseId) {
            try {
                const medResult = await pool.query(
                    'SELECT name, dosage, notes FROM medicines WHERE disease_id = $1',
                    [diseaseId]
                );
                medicines = medResult.rows;
            } catch (dbErr) {
                console.error(`[${new Date().toISOString()}] Failed to fetch medicines:`, dbErr.message);
            }
        }

        // ---- Final Response ----
        console.log(`[${new Date().toISOString()}] Returning structured JSON response to frontend (Total time: ${Date.now() - startTime}ms).`);
        res.json({
            diagnosis: {
                condition: condition,
                confidence_score: confidence,
                severity: severity,
                description: description,
                precautions: precautions,
                low_confidence: lowConfidence,
                medicines: medicines.length > 0 ? medicines : recommendedMedicines.map(m => ({name: m})),
                image_url: imageUrl,
            },
            emergency: {
                isEmergency: emergencyResult.isEmergency,
                alertMessage: emergencyResult.alertMessage,
                recommendedAction: emergencyResult.recommendedAction
            },
            disclaimer: MEDICAL_DISCLAIMER,
        });

    } catch (err) {
        console.error(`[${new Date().toISOString()}] Fatal error inside /api/diagnose route:`, err);
        // Do not allow the system to crash
        res.status(502).json({ error: "AI service temporarily unavailable" });
    }
});

module.exports = router;
