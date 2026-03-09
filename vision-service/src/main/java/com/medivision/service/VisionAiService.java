package com.medivision.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medivision.dto.DiagnosisResponse;
import com.medivision.exception.AiApiException;
import javax.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.*;
import java.util.concurrent.TimeUnit;

/**
 * VisionAiService — Integrates with Google Gemini Vision API.
 * Uses gemini-2.5-flash-preview-04-17 (multimodal) for image diagnosis
 * and gemini-2.5-flash-lite for chat.
 * 
 * Features:
 *  - Structured medical JSON output
 *  - Exponential backoff retry (3 attempts: 0s, 2s, 6s)
 *  - Context-aware chatbot with disease history
 */
@Service
public class VisionAiService {

    private static final Logger log = LoggerFactory.getLogger(VisionAiService.class);

    @Value("${ai.provider:gemini}")
    private String aiProvider;

    @Value("${ai.openai.api-key:}")
    private String openaiApiKey;

    @Value("${ai.gemini.vision.api-key:}")
    private String geminiVisionApiKey;

    @Value("${ai.gemini.chat.api-key:}")
    private String geminiChatApiKey;

    // Vision model: gemini-2.0-flash supports multimodal input
    private static final String GEMINI_VISION_MODEL = "gemini-2.5-flash-lite";
    // Chat model: lightweight and fast
    private static final String GEMINI_CHAT_MODEL   = "gemini-2.5-flash-lite";

    private static final int MAX_RETRIES = 3;

    private final ObjectMapper mapper = new ObjectMapper();

    private WebClient openaiClient;
    private WebClient geminiClient;

    @PostConstruct
    void init() {
        openaiClient = WebClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .defaultHeader("Authorization", "Bearer " + openaiApiKey)
                .codecs(c -> c.defaultCodecs().maxInMemorySize(20 * 1024 * 1024))
                .build();

        geminiClient = WebClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .codecs(c -> c.defaultCodecs().maxInMemorySize(20 * 1024 * 1024))
                .build();

        log.info("VisionAiService initialized. AI provider: {}", aiProvider);
        log.info("Gemini Vision Key configured: {}", !geminiVisionApiKey.isEmpty());
        log.info("Gemini Chat Key configured: {}",  !geminiChatApiKey.isEmpty());
    }

    // ---------------------------------------------------------------
    // Public API — Image Analysis
    // ---------------------------------------------------------------

    /**
     * Analyse a medical image with accompanying symptoms.
     * Returns structured DiagnosisResponse with full field set.
     */
    public DiagnosisResponse analyse(byte[] imageBytes, String mimeType, List<String> symptoms) {
        if ("dummy-gemini-key".equals(geminiVisionApiKey) || geminiVisionApiKey.isBlank()) {
            log.warn("Using MOCK AI response — no API key configured.");
            return mockResponse();
        }

        String symptomText = (symptoms == null || symptoms.isEmpty())
                ? "No specific symptoms reported."
                : String.join(", ", symptoms);

        String prompt = buildVisionPrompt(symptomText);

        Exception lastError = new AiApiException("All " + MAX_RETRIES + " attempts failed.");
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                log.info("Gemini Vision API attempt {}/{}", attempt, MAX_RETRIES);
                
                String rawJson;
                if ("openai".equalsIgnoreCase(aiProvider)) {
                    rawJson = callOpenAi(imageBytes, mimeType, prompt);
                } else {
                    rawJson = callGeminiVision(imageBytes, mimeType, prompt);
                }

                DiagnosisResponse result = parseAiResponse(rawJson);
                log.info("Vision analysis succeeded on attempt {} — disease: {}, confidence: {}",
                        attempt, result.getDisease(), result.getConfidence());
                return result;

            } catch (WebClientResponseException e) {
                lastError = e;
                HttpStatus status = HttpStatus.valueOf(e.getStatusCode().value());
                log.error("Gemini Vision API error (attempt {}): {} — {}", attempt, status, e.getResponseBodyAsString());

                if (status == HttpStatus.TOO_MANY_REQUESTS || status == HttpStatus.SERVICE_UNAVAILABLE) {
                    // Quota or server overload — exponential backoff
                    sleepBeforeRetry(attempt);
                } else if (status == HttpStatus.UNAUTHORIZED || status == HttpStatus.FORBIDDEN) {
                    // Key invalid — no point retrying
                    log.error("Fatal auth error from Gemini. Check API key configuration.");
                    throw new AiApiException("Gemini API authentication failed. Verify the API key.", e);
                } else if (status == HttpStatus.BAD_REQUEST) {
                    // Probably a malformed request — no point retrying
                    log.error("Bad request to Gemini API: {}", e.getResponseBodyAsString());
                    throw new AiApiException("Invalid request to Gemini API.", e);
                } else {
                    sleepBeforeRetry(attempt);
                }

            } catch (Exception e) {
                lastError = e;
                log.error("Vision API attempt {} failed: {}", attempt, e.getMessage());
                if (attempt < MAX_RETRIES) sleepBeforeRetry(attempt);
            }
        }

        log.error("All {} attempts to Gemini Vision API failed.", MAX_RETRIES);
        throw new AiApiException("AI vision analysis failed after " + MAX_RETRIES + " attempts: " + lastError.getMessage(), lastError);
    }

    // ---------------------------------------------------------------
    // Public API — Chat
    // ---------------------------------------------------------------

    /**
     * Get a context-aware chat response from Gemini.
     * diseaseContext is optional and personalises the response.
     */
    public String getChatResponse(String userMessage, String diseaseContext, List<Map<String, String>> conversationHistory) {
        if (geminiChatApiKey.isBlank()) {
            return "AI Chat is currently unavailable — no API key configured. Please contact support.";
        }

        String systemContext = buildChatSystemPrompt(diseaseContext);

        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                log.info("Gemini Chat API attempt {}/{}", attempt, MAX_RETRIES);

                if ("openai".equalsIgnoreCase(aiProvider)) {
                    return callOpenAiChat(systemContext, userMessage, conversationHistory);
                } else {
                    return callGeminiChat(systemContext, userMessage, conversationHistory);
                }

            } catch (WebClientResponseException e) {
                HttpStatus status = HttpStatus.valueOf(e.getStatusCode().value());
                log.warn("Gemini Chat API error (attempt {}): {}", attempt, status);

                if (status == HttpStatus.TOO_MANY_REQUESTS || status == HttpStatus.SERVICE_UNAVAILABLE) {
                    sleepBeforeRetry(attempt);
                } else {
                    break; // non-retriable
                }
            } catch (Exception e) {
                log.error("Chat API attempt {} failed: {}", attempt, e.getMessage());
                if (attempt < MAX_RETRIES) sleepBeforeRetry(attempt);
            }
        }

        log.error("Chat API failed after {} attempts", MAX_RETRIES);
        return "I'm temporarily unable to process your request. Please try again in a moment. " +
               "For urgent medical concerns, please consult a qualified healthcare professional.";
    }

    // BACKWARD COMPAT — simple version without history
    public String getChatResponse(String userMessage) {
        return getChatResponse(userMessage, null, Collections.emptyList());
    }

    // ---------------------------------------------------------------
    // Prompt Engineering
    // ---------------------------------------------------------------

    private String buildVisionPrompt(String symptoms) {
        return "You are an expert dermatologist AI assistant. " +
               "Analyze the skin image provided and identify any visible dermatological conditions.\n\n" +
               "Patient-reported symptoms: " + symptoms + "\n\n" +
               "CRITICAL INSTRUCTIONS:\n" +
               "1. Respond ONLY with a valid JSON object — no markdown, no code fences, no explanation outside the JSON.\n" +
               "2. If the image is NOT a skin/medical image, set disease to \"Not a skin image\" and confidence to 0.\n" +
               "3. If you cannot identify a condition but it IS a skin image, set disease to \"Unidentified\" with your best confidence.\n" +
               "4. confidence must be a decimal between 0.0 and 1.0 (e.g., 0.87)\n" +
               "5. severity must be exactly one of: mild, moderate, severe\n\n" +
               "Respond with this exact JSON structure (no extra fields):\n" +
               "{\n" +
               "  \"disease\": \"string — name of the skin condition or 'Unidentified'\",\n" +
               "  \"confidence\": 0.00,\n" +
               "  \"severity\": \"mild | moderate | severe\",\n" +
               "  \"description\": \"2-3 sentence clinical description of the condition\",\n" +
               "  \"possible_causes\": [\"cause 1\", \"cause 2\", \"cause 3\"],\n" +
               "  \"precautions\": [\"precaution 1\", \"precaution 2\", \"precaution 3\"],\n" +
               "  \"recommended_medicines\": [\"medicine 1 with dosage\", \"medicine 2\"],\n" +
               "  \"doctor_required\": true\n" +
               "}";
    }

    private String buildChatSystemPrompt(String diseaseContext) {
        String base = "You are a professional, empathetic medical assistant specializing in dermatology and skin health. " +
                      "Provide clear, accurate medical information with appropriate disclaimers. " +
                      "Always recommend consulting a qualified doctor for diagnosis and treatment. " +
                      "Be concise but thorough. Use plain language.\n\n" +
                      "Topics you can help with: skin diseases, symptoms, precautions, medicines, when to see a doctor, " +
                      "treatment options, lifestyle advice for skin conditions.\n\n" +
                      "IMPORTANT: Always include a brief disclaimer that you provide general information, not a medical diagnosis.";

        if (diseaseContext != null && !diseaseContext.isBlank()) {
            base += "\n\nCONTEXT: The user has recently been diagnosed with or is asking about: " + diseaseContext +
                    ". Tailor your responses to be relevant to this condition where appropriate.";
        }

        return base;
    }

    // ---------------------------------------------------------------
    // Gemini Vision API Call
    // ---------------------------------------------------------------

    private String callGeminiVision(byte[] imageBytes, String mimeType, String prompt) {
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);

        Map<String, Object> inlineData = Map.of("mimeType", mimeType, "data", base64Image);
        Map<String, Object> imagePart  = Map.of("inlineData", inlineData);
        Map<String, Object> textPart   = Map.of("text", prompt);
        Map<String, Object> content    = Map.of("parts", List.of(textPart, imagePart));
        Map<String, Object> body       = Map.of(
                "contents", List.of(content),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "temperature", 0.1,
                        "maxOutputTokens", 1024
                )
        );

        String response = geminiClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/models/" + GEMINI_VISION_MODEL + ":generateContent")
                        .queryParam("key", geminiVisionApiKey)
                        .build())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        return extractGeminiText(response);
    }

    // ---------------------------------------------------------------
    // Gemini Chat API Call
    // ---------------------------------------------------------------

    private String callGeminiChat(String systemPrompt, String userMessage, List<Map<String, String>> history) {
        List<Map<String, Object>> contents = new ArrayList<>();

        // System instruction as first user turn (Gemini pattern)
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", systemPrompt))
        ));
        contents.add(Map.of(
                "role", "model",
                "parts", List.of(Map.of("text", "Understood. I am your MediVision medical assistant. How can I help you today?"))
        ));

        // Add conversation history
        if (history != null) {
            for (Map<String, String> msg : history) {
                String role = "user".equals(msg.get("role")) ? "user" : "model";
                contents.add(Map.of(
                        "role", role,
                        "parts", List.of(Map.of("text", msg.getOrDefault("content", "")))
                ));
            }
        }

        // Current message
        contents.add(Map.of(
                "role", "user",
                "parts", List.of(Map.of("text", userMessage))
        ));

        Map<String, Object> body = Map.of(
                "contents", contents,
                "generationConfig", Map.of(
                        "temperature", 0.7,
                        "maxOutputTokens", 2048
                )
        );

        String response = geminiClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/models/" + GEMINI_CHAT_MODEL + ":generateContent")
                        .queryParam("key", geminiChatApiKey)
                        .build())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        return extractGeminiText(response);
    }

    // ---------------------------------------------------------------
    // OpenAI Fallback
    // ---------------------------------------------------------------

    private String callOpenAi(byte[] imageBytes, String mimeType, String prompt) {
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);

        Map<String, Object> imageUrl  = Map.of("url", "data:" + mimeType + ";base64," + base64Image);
        Map<String, Object> imagePart = Map.of("type", "image_url", "image_url", imageUrl);
        Map<String, Object> textPart  = Map.of("type", "text", "text", prompt);
        Map<String, Object> message   = Map.of("role", "user", "content", List.of(textPart, imagePart));
        Map<String, Object> body      = Map.of("model", "gpt-4o", "messages", List.of(message), "max_tokens", 1024);

        String response = openaiClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        try {
            JsonNode root = mapper.readTree(response);
            return root.at("/choices/0/message/content").asText();
        } catch (Exception e) {
            throw new AiApiException("Failed to parse OpenAI response", e);
        }
    }

    private String callOpenAiChat(String systemPrompt, String userMessage, List<Map<String, String>> history) {
        List<Map<String, Object>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));

        if (history != null) {
            for (Map<String, String> msg : history) {
                messages.add(Map.of("role", msg.getOrDefault("role", "user"), "content", msg.getOrDefault("content", "")));
            }
        }

        messages.add(Map.of("role", "user", "content", userMessage));

        Map<String, Object> body = Map.of("model", "gpt-4o", "messages", messages);

        String response = openaiClient.post()
                .uri("/chat/completions")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        try {
            JsonNode root = mapper.readTree(response);
            return root.at("/choices/0/message/content").asText();
        } catch (Exception e) {
            throw new AiApiException("Failed to parse OpenAI chat response", e);
        }
    }

    // ---------------------------------------------------------------
    // Response Parsing
    // ---------------------------------------------------------------

    private String extractGeminiText(String rawResponse) {
        try {
            JsonNode root = mapper.readTree(rawResponse);
            String text = root.at("/candidates/0/content/parts/0/text").asText();
            if (text == null || text.isBlank()) {
                // Check if blocked
                JsonNode blockReason = root.at("/candidates/0/finishReason");
                log.warn("Gemini empty text response. Finish reason: {}", blockReason.asText());
                throw new AiApiException("Empty response from Gemini API. Finish reason: " + blockReason.asText());
            }
            // Strip markdown code fences if present
            return text.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
        } catch (AiApiException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to extract Gemini response text. Raw: {}", rawResponse, e);
            throw new AiApiException("Failed to parse Gemini response structure", e);
        }
    }

    private DiagnosisResponse parseAiResponse(String rawJson) {
        try {
            JsonNode node = mapper.readTree(rawJson);

            String disease     = node.path("disease").asText("Unidentified");
            double confidence  = node.path("confidence").asDouble(0.0);
            String severity    = node.path("severity").asText("mild");
            String description = node.path("description").asText("No description provided.");
            boolean doctorReq  = node.path("doctor_required").asBoolean(true);

            // Clamp confidence
            confidence = Math.max(0.0, Math.min(1.0, confidence));

            // Validate severity
            Set<String> validSeverities = Set.of("mild", "moderate", "severe", "none");
            if (!validSeverities.contains(severity.toLowerCase())) {
                severity = "mild";
            } else {
                severity = severity.toLowerCase();
            }

            List<String> precautions = parseStringArray(node, "precautions");
            List<String> medicines   = parseStringArray(node, "recommended_medicines");
            List<String> causes      = parseStringArray(node, "possible_causes");

            return DiagnosisResponse.builder()
                    .disease(disease)
                    .confidence(confidence)
                    .severity(severity)
                    .description(description)
                    .precautions(precautions)
                    .recommendedMedicines(medicines)
                    .possibleCauses(causes)
                    .doctorRequired(doctorReq)
                    .lowConfidence(confidence < 0.50)
                    .build();

        } catch (Exception e) {
            log.error("Could not parse AI response JSON: {}", rawJson, e);
            return DiagnosisResponse.builder()
                    .disease("Unidentified")
                    .confidence(0.0)
                    .severity("mild")
                    .description("AI analysis result could not be parsed. Please try again.")
                    .precautions(List.of("Please consult a healthcare professional for accurate diagnosis."))
                    .recommendedMedicines(List.of())
                    .possibleCauses(List.of())
                    .doctorRequired(true)
                    .lowConfidence(true)
                    .build();
        }
    }

    private List<String> parseStringArray(JsonNode node, String field) {
        List<String> result = new ArrayList<>();
        JsonNode arr = node.get(field);
        if (arr != null && arr.isArray()) {
            arr.forEach(item -> result.add(item.asText()));
        }
        return result;
    }

    // ---------------------------------------------------------------
    // Utilities
    // ---------------------------------------------------------------

    private void sleepBeforeRetry(int attempt) {
        long delay = (long) Math.pow(2, attempt - 1) * 2000L; // 2s, 4s, 8s
        log.info("Waiting {}ms before retry...", delay);
        try {
            TimeUnit.MILLISECONDS.sleep(delay);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    private DiagnosisResponse mockResponse() {
        return DiagnosisResponse.builder()
                .disease("Mock Eczema (Demo Mode)")
                .confidence(0.92)
                .severity("moderate")
                .description("This is a mock AI response for demonstration. Configure a real Gemini API key to enable live analysis.")
                .precautions(List.of("Apply moisturizer twice daily", "Avoid harsh soaps", "Consult a real doctor"))
                .recommendedMedicines(List.of("Hydrocortisone Cream 1%", "Cetirizine 10mg"))
                .possibleCauses(List.of("Dry skin", "Allergen exposure", "Stress"))
                .doctorRequired(true)
                .lowConfidence(false)
                .build();
    }
}
