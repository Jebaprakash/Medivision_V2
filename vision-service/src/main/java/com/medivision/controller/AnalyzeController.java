package com.medivision.controller;

import com.medivision.dto.DiagnosisResponse;
import com.medivision.service.VisionAiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Arrays;
import java.util.List;
import java.util.Set;

/**
 * REST controller for medical image analysis.
 * Accepts a multipart image and optional symptom list, then returns
 * a structured diagnosis from the configured AI Vision provider.
 */
@RestController
@RequestMapping("/analyze")
@CrossOrigin(origins = "*")
public class AnalyzeController {

    private static final Logger log = LoggerFactory.getLogger(AnalyzeController.class);

    /** Allowed MIME types for uploaded images */
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp");

    /** Maximum file size: 10 MB */
    private static final long MAX_SIZE_BYTES = 10L * 1024 * 1024;

    private final VisionAiService visionAiService;

    public AnalyzeController(VisionAiService visionAiService) {
        this.visionAiService = visionAiService;
    }

    /**
     * POST /analyze
     *
     * @param image    medical image (jpg, png, or webp — max 10 MB)
     * @param symptoms comma-separated symptom list (optional)
     * @return DiagnosisResponse JSON
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DiagnosisResponse> analyze(
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "symptoms", required = false, defaultValue = "") String symptoms) {
        // --- Validate file is present ---
        if (image.isEmpty()) {
            throw new IllegalArgumentException("No image file provided.");
        }

        // --- Validate MIME type ---
        String contentType = image.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            throw new IllegalArgumentException(
                    "Invalid file type '" + contentType + "'. Allowed types: JPG, PNG, WebP.");
        }

        // --- Validate file size ---
        if (image.getSize() > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException(
                    "File size exceeds the 10 MB limit. Current size: "
                            + (image.getSize() / (1024 * 1024)) + " MB.");
        }

        // --- Parse symptom list ---
        List<String> symptomList = symptoms.isBlank()
                ? List.of()
                : Arrays.stream(symptoms.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(java.util.stream.Collectors.toList());

        log.info("Analysing image: type={}, size={} bytes, symptoms={}",
                contentType, image.getSize(), symptomList);

        try {
            byte[] imageBytes = image.getBytes();
            DiagnosisResponse response = visionAiService.analyse(imageBytes, contentType, symptomList);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            throw new RuntimeException("Image processing failed: " + e.getMessage(), e);
        }
    }
}
