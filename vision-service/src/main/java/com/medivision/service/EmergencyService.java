package com.medivision.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;

/**
 * Emergency Detection Service — config-driven severity classification.
 * Maps detected conditions to severity levels and determines emergency escalation.
 */
@Service
public class EmergencyService {

    private static final Logger log = LoggerFactory.getLogger(EmergencyService.class);

    // Severe conditions that trigger emergency alerts
    private static final Set<String> SEVERE_CONDITIONS = Set.of(
            "melanoma", "melanoma (warning)", "squamous cell carcinoma",
            "basal cell carcinoma", "necrotizing fasciitis", "severe infection",
            "cellulitis", "sepsis", "merkel cell carcinoma"
    );

    // Moderate conditions
    private static final Set<String> MODERATE_CONDITIONS = Set.of(
            "psoriasis", "eczema", "dermatitis", "rosacea", "vitiligo",
            "shingles", "herpes zoster", "impetigo"
    );

    private static final double EMERGENCY_CONFIDENCE_THRESHOLD = 0.5;

    /**
     * Classify the severity of a detected condition.
     *
     * @param conditionName  the detected disease name
     * @param confidenceScore AI confidence (0-1)
     * @return map containing severity, isEmergency, alertMessage, recommendedAction
     */
    public Map<String, Object> classifySeverity(String conditionName, double confidenceScore) {
        String normalized = conditionName != null ? conditionName.toLowerCase().trim() : "";

        String severity = "mild";

        // Check severe conditions first
        for (String severe : SEVERE_CONDITIONS) {
            if (normalized.contains(severe)) {
                severity = "severe";
                break;
            }
        }

        if ("mild".equals(severity)) {
            for (String moderate : MODERATE_CONDITIONS) {
                if (normalized.contains(moderate)) {
                    severity = "moderate";
                    break;
                }
            }
        }

        boolean isEmergency = "severe".equals(severity) && confidenceScore >= EMERGENCY_CONFIDENCE_THRESHOLD;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("severity", severity);
        result.put("isEmergency", isEmergency);
        result.put("alertMessage", isEmergency
                ? String.format("EMERGENCY: Possible serious condition \"%s\" detected with %.0f%% confidence. Please consult a doctor immediately.",
                conditionName, confidenceScore * 100)
                : null);
        result.put("recommendedAction", isEmergency
                ? "Seek immediate medical consultation. Visit the nearest hospital."
                : "moderate".equals(severity)
                ? "Schedule an appointment with a dermatologist."
                : "Monitor the condition and maintain good skincare.");

        log.info("Severity classification: condition={}, severity={}, emergency={}", conditionName, severity, isEmergency);
        return result;
    }

    public Set<String> getSevereConditions() {
        return SEVERE_CONDITIONS;
    }
}
