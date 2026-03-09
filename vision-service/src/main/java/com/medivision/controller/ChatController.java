package com.medivision.controller;

import com.medivision.service.AuditLogService;
import com.medivision.service.VisionAiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Chat Controller — handles AI-powered medical chatbot interactions.
 * Now properly delegates context + history to VisionAiService.getChatResponse()
 * which passes them to Gemini for fully context-aware responses.
 */
@RestController
@RequestMapping("/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    private final VisionAiService visionAiService;
    private final AuditLogService auditLogService;

    public ChatController(VisionAiService visionAiService, AuditLogService auditLogService) {
        this.visionAiService = visionAiService;
        this.auditLogService = auditLogService;
    }

    /**
     * POST /chat — context-aware medical chat.
     *
     * Request body:
     *   message            : String  (required)
     *   diseaseContext     : String  (optional — e.g. "Eczema")
     *   conversationHistory: Array   (optional — prior messages [{role, content}])
     */
    @SuppressWarnings("unchecked")
    @PostMapping
    public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, Object> request) {
        String message = (String) request.get("message");
        if (message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message is required"));
        }

        String diseaseContext = (String) request.get("diseaseContext");
        List<Map<String, String>> history;
        try {
            history = (List<Map<String, String>>) request.get("conversationHistory");
        } catch (ClassCastException e) {
            history = Collections.emptyList();
        }
        if (history == null) history = Collections.emptyList();

        // Delegate to service with full context
        String reply = visionAiService.getChatResponse(message, diseaseContext, history);

        // Audit
        auditLogService.logChat(null, message);

        return ResponseEntity.ok(Map.of("reply", reply));
    }
}
