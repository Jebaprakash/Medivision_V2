/**
 * Emergency Detection Service
 * Config-driven severity classification with escalation rules.
 */

// Severity rules — easy to update without code changes
const SEVERITY_RULES = {
    // Disease name (lowercase) → severity override
    severe: [
        'melanoma', 'melanoma (warning)', 'squamous cell carcinoma',
        'basal cell carcinoma', 'necrotizing fasciitis', 'severe infection',
        'cellulitis', 'sepsis', 'merkel cell carcinoma'
    ],
    moderate: [
        'psoriasis', 'eczema', 'dermatitis', 'rosacea', 'vitiligo',
        'shingles', 'herpes zoster', 'impetigo'
    ],
    mild: [
        'acne', 'ringworm', 'fungal infection', 'tinea', 'warts',
        'contact dermatitis', 'heat rash', 'dry skin'
    ]
};

// Emergency alert thresholds
const EMERGENCY_THRESHOLD = {
    minConfidence: 0.5,          // Only trigger emergency if confidence >= 50%
    severeConditions: SEVERITY_RULES.severe
};

/**
 * Classify severity based on detected condition name.
 * @param {string} conditionName - The detected disease name
 * @param {number} confidenceScore - AI confidence (0-1)
 * @returns {{ severity: string, isEmergency: boolean, alertMessage: string|null }}
 */
function classifySeverity(conditionName, confidenceScore = 0) {
    const normalizedName = (conditionName || '').toLowerCase().trim();
    
    let severity = 'mild'; // default

    // Check severe conditions first
    if (SEVERITY_RULES.severe.some(d => normalizedName.includes(d))) {
        severity = 'severe';
    } else if (SEVERITY_RULES.moderate.some(d => normalizedName.includes(d))) {
        severity = 'moderate';
    } else if (SEVERITY_RULES.mild.some(d => normalizedName.includes(d))) {
        severity = 'mild';
    }

    // Emergency detection
    const isEmergency = severity === 'severe' && confidenceScore >= EMERGENCY_THRESHOLD.minConfidence;

    return {
        severity,
        isEmergency,
        alertMessage: isEmergency
            ? `⚠️ EMERGENCY: Possible serious condition "${conditionName}" detected with ${Math.round(confidenceScore * 100)}% confidence. Please consult a doctor immediately.`
            : null,
        recommendedAction: isEmergency
            ? 'Seek immediate medical consultation. Visit the nearest hospital or call emergency services.'
            : severity === 'moderate'
                ? 'Schedule an appointment with a dermatologist within the next few days.'
                : 'Monitor the condition and maintain good skincare practices.'
    };
}

/**
 * Get the list of severe conditions (for frontend reference).
 */
function getSevereConditions() {
    return SEVERITY_RULES.severe;
}

/**
 * Check if a condition requires emergency alert.
 */
function requiresEmergencyAlert(conditionName, confidenceScore) {
    const result = classifySeverity(conditionName, confidenceScore);
    return result.isEmergency;
}

module.exports = {
    classifySeverity,
    getSevereConditions,
    requiresEmergencyAlert,
    SEVERITY_RULES
};
