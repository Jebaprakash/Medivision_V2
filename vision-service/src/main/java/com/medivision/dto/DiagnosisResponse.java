package com.medivision.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response DTO returned by the /analyze endpoint.
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
    
    /** Short explanation of the condition */
    private String description;

    /** List of recommended precautions */
    private List<String> precautions;
    
    /** List of recommended common medicines */
    @JsonProperty("recommended_medicines")
    private List<String> recommendedMedicines;

    /**
     * Flag set to true when confidence_score < 0.50.
     * Frontend should show a prominent warning in this case.
     */
    @JsonProperty("low_confidence")
    private boolean lowConfidence;
}
