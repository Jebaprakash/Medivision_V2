package com.medivision.exception;

/**
 * Custom exception thrown when the AI provider API call fails.
 */
public class AiApiException extends RuntimeException {
    public AiApiException(String message) {
        super(message);
    }

    public AiApiException(String message, Throwable cause) {
        super(message, cause);
    }
}
