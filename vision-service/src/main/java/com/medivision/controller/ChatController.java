package com.medivision.controller;

import com.medivision.service.AuditLogService;
import com.medivision.service.VisionAiService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Chat Controller — handles AI-powered medical chatbot interactions.
 * Accepts disease context and conversation history for context-aware responses.
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
     * POST /chat — send a message with optional disease context.
     */
    @SuppressWarnings("unchecked")
    @PostMapping
    public ResponseEntity<Map<String, String>> chat(@RequestBody Map<String, Object> request) {
        String message = (String) request.get("message");
        if (message == null || message.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Message is required"));
        }

        String diseaseContext = (String) request.get("diseaseContext");
        List<Map<String, String>> history = (List<Map<String, String>>) request.get("conversationHistory");

        // Build context-aware prompt
        String contextualMessage = buildContextualMessage(message, diseaseContext, history);

        // Get AI response
        String reply = visionAiService.getChatResponse(contextualMessage);

        // Audit log
        auditLogService.logChat(null, message);

        return ResponseEntity.ok(Map.of("reply", reply));
    }

    /**
     * Build a context-aware message by injecting disease context and conversation history.
     */
    private String buildContextualMessage(String message, String diseaseContext, List<Map<String, String>> history) {
        StringBuilder sb = new StringBuilder();

        // Inject disease context if available
        if (diseaseContext != null && !diseaseContext.isBlank()) {
            sb.append("[Context: The patient has been diagnosed with '").append(diseaseContext)
                    .append("'. Provide relevant medical information about this condition.]\n\n");
        }

        // Include recent conversation for continuity (last 5 messages)
        if (history != null && !history.isEmpty()) {
            sb.append("Previous conversation:\n");
            int start = Math.max(0, history.size() - 5);
            for (int i = start; i < history.size(); i++) {
                Map<String, String> msg = history.get(i);
                String role = msg.getOrDefault("role", "user");
                String content = msg.getOrDefault("content", "");
                sb.append(role).append(": ").append(content).append("\n");
            }
            sb.append("\n");
        }

        sb.append("User question: ").append(message);
        return sb.toString();
    }
}
