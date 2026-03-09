package com.medivision.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO returned by the /analyze endpoint.
 * Matches the structured output from Gemini Vision API.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DiagnosisResponse {

    /** Detected medical condition name */
    private String disease;

    /** AI confidence score between 0.0 and 1.0 */
    private double confidence;

    /** Severity level: mild | moderate | severe */
    private String severity;

    /** Short clinical explanation of the condition */
    private String description;

    /** List of recommended precautions */
    private List<String> precautions;

    /** List of recommended medicines with dosage info */
    @JsonProperty("recommended_medicines")
    private List<String> recommendedMedicines;

    /** List of possible underlying causes */
    @JsonProperty("possible_causes")
    private List<String> possibleCauses;

    /** Whether immediate doctor consultation is required */
    @JsonProperty("doctor_required")
    private boolean doctorRequired;

    /**
     * Flag set to true when confidence < 0.50.
     * Frontend shows a prominent warning in this case.
     */
    @JsonProperty("low_confidence")
    private boolean lowConfidence;
}
