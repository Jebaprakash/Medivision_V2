/**
 * ============================================================
 * MediVision AI — Integration Example
 * ============================================================
 *
 * This file demonstrates how the Node.js Express backend calls
 * the Spring Boot /analyze endpoint using axios with multipart
 * form data forwarding and comprehensive error handling.
 *
 * This is a standalone, runnable snippet — NOT part of the main
 * application. It is provided for documentation / reference.
 * ============================================================
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

// Configuration — in production these come from process.env
const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:8080';

/**
 * Calls the Spring Boot Vision Service with an image and symptom list.
 *
 * @param {string} imagePath   — absolute path to the image file on disk
 * @param {string[]} symptoms  — array of symptom strings
 * @returns {Promise<object>}  — parsed DiagnosisResponse from the vision service
 */
async function analyseImage(imagePath, symptoms = []) {
    // 1. Validate that the file exists
    if (!fs.existsSync(imagePath)) {
        throw new Error(`Image file not found: ${imagePath}`);
    }

    // 2. Build multipart form data
    const formData = new FormData();
    formData.append('image', fs.createReadStream(imagePath), {
        filename: path.basename(imagePath),
        contentType: getContentType(imagePath),
    });
    formData.append('symptoms', symptoms.join(','));

    try {
        // 3. Send POST request to Spring Boot /analyze endpoint
        const response = await axios.post(`${VISION_SERVICE_URL}/analyze`, formData, {
            headers: {
                ...formData.getHeaders(), // Sets Content-Type: multipart/form-data with boundary
            },
            maxContentLength: 15 * 1024 * 1024,   // 15 MB max
            maxBodyLength: 15 * 1024 * 1024,
            timeout: 60000,                        // 60 seconds — AI inference can be slow
        });

        const result = response.data;
        console.log('✅ Diagnosis received:', JSON.stringify(result, null, 2));

        // 4. Check for low confidence
        if (result.low_confidence) {
            console.warn('⚠️  Low confidence score — recommend doctor consultation.');
        }

        return result;
    } catch (error) {
        // 5. Structured error handling
        if (error.response) {
            // The vision service responded with an error status
            console.error(`❌ Vision service error [${error.response.status}]:`,
                error.response.data?.message || error.response.statusText);

            if (error.response.status === 413) {
                throw new Error('Image file is too large. Maximum size is 10 MB.');
            }
            if (error.response.status === 400) {
                throw new Error(`Invalid request: ${error.response.data?.message}`);
            }
            throw new Error('AI analysis failed. Please try again later.');
        } else if (error.code === 'ECONNREFUSED') {
            // Vision service is not running
            console.error('❌ Cannot connect to Vision Service at', VISION_SERVICE_URL);
            throw new Error('AI analysis service is currently offline. Please try again later.');
        } else if (error.code === 'ECONNABORTED') {
            // Request timed out
            console.error('❌ Vision service request timed out.');
            throw new Error('AI analysis timed out. The image may be too complex. Please try again.');
        } else {
            // Unknown error
            console.error('❌ Unexpected error:', error.message);
            throw new Error('An unexpected error occurred during analysis.');
        }
    }
}

/**
 * Helper: Determine MIME type from file extension.
 */
function getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
    };
    return types[ext] || 'application/octet-stream';
}

// ============================================================
// Example usage (run with: node integration-example.js)
// ============================================================
(async () => {
    try {
        const result = await analyseImage(
            path.join(__dirname, 'sample-skin-image.jpg'),
            ['itching', 'redness', 'discoloration']
        );

        console.log('\n--- Summary ---');
        console.log(`Condition : ${result.condition}`);
        console.log(`Confidence: ${(result.confidence_score * 100).toFixed(1)}%`);
        console.log(`Severity  : ${result.severity}`);
        console.log(`Precautions: ${result.precautions.join(', ')}`);
    } catch (err) {
        console.error('\nAnalysis failed:', err.message);
    }
})();
