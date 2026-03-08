package com.medivision.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Audit Log Service — logs key system events for tracking and debugging.
 * In a production system, this would persist to the audit_log table via JPA.
 * Currently logs to SLF4J; can be extended with database persistence.
 */
@Service
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);
    private static final DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    /**
     * Log a system event.
     *
     * @param eventType e.g. "DIAGNOSIS_COMPLETED", "CHAT_MESSAGE", "EMERGENCY_DETECTED"
     * @param userId    the user performing the action (nullable)
     * @param details   additional context as key-value pairs
     */
    public void logEvent(String eventType, String userId, Map<String, Object> details) {
        String timestamp = LocalDateTime.now().format(fmt);
        log.info("[AUDIT] {} | user={} | event={} | details={}",
                timestamp, userId != null ? userId : "system", eventType, details);
    }

    /**
     * Log a diagnosis event.
     */
    public void logDiagnosis(String userId, String condition, String severity, double confidence) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("condition", condition);
        details.put("severity", severity);
        details.put("confidence", confidence);
        logEvent("DIAGNOSIS_COMPLETED", userId, details);
    }

    /**
     * Log an emergency detection event.
     */
    public void logEmergency(String userId, String condition, double confidence) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("condition", condition);
        details.put("confidence", confidence);
        details.put("action", "emergency_alert_triggered");
        logEvent("EMERGENCY_DETECTED", userId, details);
    }

    /**
     * Log a chat interaction.
     */
    public void logChat(String userId, String messagePreview) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("preview", messagePreview.length() > 50
                ? messagePreview.substring(0, 50) + "..."
                : messagePreview);
        logEvent("CHAT_MESSAGE", userId, details);
    }

    /**
     * Log a consultation booking.
     */
    public void logConsultationBooking(String userId, String doctorId) {
        Map<String, Object> details = new LinkedHashMap<>();
        details.put("doctorId", doctorId);
        logEvent("CONSULTATION_BOOKED", userId, details);
    }
}
