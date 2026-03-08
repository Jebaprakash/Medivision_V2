package com.medivision.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import java.time.Instant;
import java.util.Map;

/**
 * Global exception handler for the vision service.
 * Returns consistent JSON error responses for all failure modes.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleBadRequest(IllegalArgumentException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String, Object>> handleFileTooLarge(MaxUploadSizeExceededException ex) {
        return buildResponse(HttpStatus.PAYLOAD_TOO_LARGE,
                "File size exceeds the 10 MB limit. Please upload a smaller image.");
    }

    @ExceptionHandler(AiApiException.class)
    public ResponseEntity<Map<String, Object>> handleAiApiError(AiApiException ex) {
        return buildResponse(HttpStatus.SERVICE_UNAVAILABLE,
                "AI analysis service is temporarily unavailable: " + ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        // Log the full stack trace for debugging
        ex.printStackTrace();
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred. Please try again later.");
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of(
                "error", true,
                "status", status.value(),
                "message", message,
                "timestamp", Instant.now().toString()
        ));
    }
}
