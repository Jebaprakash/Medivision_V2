package com.medivision.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.medivision.dto.DiagnosisResponse;
import com.medivision.exception.AiApiException;
import javax.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.*;

/**
 * Service that communicates with the configured AI Vision provider
 * (OpenAI Vision or Google Gemini) to analyse medical images.
 */
@Service
public class VisionAiService {

    private static final Logger log = LoggerFactory.getLogger(VisionAiService.class);

    @Value("${ai.provider:gemini}")
    private String aiProvider;

    @Value("${ai.openai.api-key:}")
    private String openaiApiKey;

    @Value("${ai.gemini.api-key:}")
    private String geminiApiKey;

    private final ObjectMapper mapper = new ObjectMapper();

    private WebClient openaiClient;
    private WebClient geminiClient;

    @PostConstruct
    void init() {
        openaiClient = WebClient.builder()
                .baseUrl("https://api.openai.com/v1")
                .defaultHeader("Authorization", "Bearer " + openaiApiKey)
                .build();

        geminiClient = WebClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com/v1beta")
                .build();
    }

    /**
     * Analyse a medical image with accompanying symptoms.
     *
     * @param imageBytes raw image bytes (validated upstream)
     * @param mimeType   e.g. "image/jpeg"
     * @param symptoms   user-reported symptom list
     * @return structured diagnosis response
     */
    public DiagnosisResponse analyse(byte[] imageBytes, String mimeType, List<String> symptoms) {
        // --- Mock Mode Fallback ---
        if ("dummy-gemini-key".equals(geminiApiKey) || "sk-dummy-key".equals(openaiApiKey)) {
            log.info("Using mock AI response since dummy API key is configured.");
            return DiagnosisResponse.builder()
                    .disease("Mock Eczema (Test Mode)")
                    .confidence(0.92)
                    .severity("moderate")
                    .description("This is a mock response serving as placeholder text.")
                    .precautions(List.of("Apply moisturizer twice daily", "Avoid hot showers", "Consult a real doctor"))
                    .recommendedMedicines(List.of("Hydrocortisone Cream", "Antihistamines"))
                    .lowConfidence(false)
                    .build();
        }

        String symptomText = symptoms == null || symptoms.isEmpty()
                ? "No specific symptoms reported."
                : String.join(", ", symptoms);

        String prompt = buildMedicalPrompt(symptomText);

        try {
            String rawJson;
            if ("openai".equalsIgnoreCase(aiProvider)) {
                rawJson = callOpenAi(imageBytes, mimeType, prompt);
            } else {
                rawJson = callGemini(imageBytes, mimeType, prompt);
            }
            return parseAiResponse(rawJson);
        } catch (AiApiException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("AI analysis failed", ex);
            throw new AiApiException("Failed to analyse image: " + ex.getMessage(), ex);
        }
    }

    // ---------------------------------------------------------------
    // Prompt Engineering
    // ---------------------------------------------------------------

    private String buildMedicalPrompt(String symptoms) {
        return "You are a dermatology AI assistant. Analyze the uploaded skin image and determine if it contains a skin condition such as acne, eczema, psoriasis, fungal infection, rash, or melanoma.\n\n"
                +
                "Respond ONLY with valid JSON.\n\n"
                +
                "If the image is clearly NOT a skin image or does not contain visible skin, return:\n"
                +
                "{\n"
                +
                "  \"disease\": \"Not a skin image\",\n"
                +
                "  \"confidence\": 0,\n"
                +
                "  \"severity\": \"none\",\n"
                +
                "  \"description\": \"The uploaded image does not appear to be a human skin image.\",\n"
                +
                "  \"precautions\": [],\n"
                +
                "  \"recommended_medicines\": []\n"
                +
                "}\n\n"
                +
                "Patient symptoms: " + symptoms + "\n\n" +
                "Otherwise, respond with exactly this JSON structure:\n" +
                "{\n" +
                "  \"disease\": \"<name of disease>\",\n" +
                "  \"confidence\": <float between 0 and 1>,\n" +
                "  \"severity\": \"<mild | moderate | severe>\",\n" +
                "  \"description\": \"<short explanation>\",\n" +
                "  \"precautions\": [\"<precaution 1>\", \"<precaution 2>\", \"...\"],\n" +
                "  \"recommended_medicines\": [\"<medicine 1>\", \"<medicine 2>\"]\n" +
                "}\n\n" +
                "Rules:\n" +
                "- If you cannot identify a condition but it is a skin image, set disease to \"Unidentified\".\n"
                +
                "- confidence must be a number between 0 and 1.\n" +
                "- severity must be exactly one of: mild, moderate, severe.\n";
    }

    // ---------------------------------------------------------------
    // OpenAI Vision API
    // ---------------------------------------------------------------

    private String callOpenAi(byte[] imageBytes, String mimeType, String prompt) {
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);

        // Build the request payload for GPT-4 Vision
        Map<String, Object> imageUrl = Map.of(
                "url", "data:" + mimeType + ";base64," + base64Image);
        Map<String, Object> imagePart = Map.of(
                "type", "image_url",
                "image_url", imageUrl);
        Map<String, Object> textPart = Map.of(
                "type", "text",
                "text", prompt);
        Map<String, Object> message = Map.of(
                "role", "user",
                "content", List.of(textPart, imagePart));
        Map<String, Object> body = Map.of(
                "model", "gpt-4o",
                "messages", List.of(message),
                "max_tokens", 1024);

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

    // ---------------------------------------------------------------
    // Google Gemini Vision API
    // ---------------------------------------------------------------

    private String callGemini(byte[] imageBytes, String mimeType, String prompt) {
        String base64Image = Base64.getEncoder().encodeToString(imageBytes);

        Map<String, Object> inlineData = Map.of(
                "mimeType", mimeType,
                "data", base64Image);
        Map<String, Object> imagePart = Map.of("inlineData", inlineData);
        Map<String, Object> textPart = Map.of("text", prompt);
        Map<String, Object> content = Map.of("parts", List.of(textPart, imagePart));
        Map<String, Object> body = Map.of("contents", List.of(content));

        String response = geminiClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/models/gemini-flash-latest:generateContent")
                        .queryParam("key", geminiApiKey)
                        .build())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        try {
            JsonNode root = mapper.readTree(response);
            String text = root.at("/candidates/0/content/parts/0/text").asText();
            // Gemini sometimes wraps JSON in markdown code fences — strip them
            return text.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
        } catch (Exception e) {
            throw new AiApiException("Failed to parse Gemini response", e);
        }
    }

    // ---------------------------------------------------------------
    // Response Parsing
    // ---------------------------------------------------------------

    /**
     * Parses the raw JSON string from the AI into a DiagnosisResponse,
     * adding the low_confidence flag when applicable.
     */
    private DiagnosisResponse parseAiResponse(String rawJson) {
        try {
            JsonNode node = mapper.readTree(rawJson);

            String disease = node.path("disease").asText("Unidentified");
            double confidence = node.path("confidence").asDouble(0.0);
            String severity = node.path("severity").asText("mild");
            String description = node.path("description").asText("");

            // Clamp confidence to [0, 1]
            confidence = Math.max(0.0, Math.min(1.0, confidence));

            // Validate severity
            if (!Set.of("mild", "moderate", "severe", "none").contains(severity.toLowerCase())) {
                severity = "mild";
            }

            List<String> precautions = new ArrayList<>();
            if (node.has("precautions") && node.get("precautions").isArray()) {
                for (JsonNode p : node.get("precautions")) {
                    precautions.add(p.asText());
                }
            }
            
            List<String> medicines = new ArrayList<>();
            if (node.has("recommended_medicines") && node.get("recommended_medicines").isArray()) {
                for (JsonNode m : node.get("recommended_medicines")) {
                    medicines.add(m.asText());
                }
            }

            return DiagnosisResponse.builder()
                    .disease(disease)
                    .confidence(confidence)
                    .severity(severity.toLowerCase())
                    .description(description)
                    .precautions(precautions)
                    .recommendedMedicines(medicines)
                    .lowConfidence(confidence < 0.50)
                    .build();

        } catch (Exception e) {
            log.error("Could not parse AI response: {}", rawJson, e);
            // Return a safe fallback so the user still gets feedback
            return DiagnosisResponse.builder()
                    .disease("Unidentified")
                    .confidence(0.0)
                    .severity("mild")
                    .description("Failed to parse the AI analysis results.")
                    .precautions(List.of("Please consult a healthcare professional for accurate diagnosis."))
                    .recommendedMedicines(List.of())
                    .lowConfidence(true)
                    .build();
        }
    }

    /**
     * Get a chat response from the AI provider (text-only).
     */
    public String getChatResponse(String userMessage) {
        // --- Mock Mode Fallback ---
        if ("dummy-gemini-key".equals(geminiApiKey) || "sk-dummy-key".equals(openaiApiKey)) {
            return "This is a mock response from MediVision AI (Test Mode). Since you are using a dummy API key, I can't reach the real AI, but typically I would provide an explanation of '"
                    + userMessage + "', precautions, and doctor-visit advice.";
        }

        String systemPrompt = "You are a professional medical chatbot assistant. Provide clear explanations, precautions, and doctor visit advice for skin conditions. Always include a medical disclaimer.";

        try {
            if ("openai".equalsIgnoreCase(aiProvider)) {
                return callOpenAiText(systemPrompt, userMessage);
            } else {
                return callGeminiText(systemPrompt, userMessage);
            }
        } catch (Exception e) {
            log.error("AI chat failed", e);
            return "I apologize, but I am unable to process your request at the moment.";
        }
    }

    private String callOpenAiText(String systemPrompt, String userMessage) {
        Map<String, Object> systemMsg = Map.of("role", "system", "content", systemPrompt);
        Map<String, Object> userMsg = Map.of("role", "user", "content", userMessage);
        Map<String, Object> body = Map.of(
                "model", "gpt-4o",
                "messages", List.of(systemMsg, userMsg));

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
            throw new AiApiException("Failed to parse OpenAI text response", e);
        }
    }

    private String callGeminiText(String systemPrompt, String userMessage) {
        Map<String, Object> textPart = Map.of("text", systemPrompt + "\n\nUser: " + userMessage);
        Map<String, Object> content = Map.of("parts", List.of(textPart));
        Map<String, Object> body = Map.of("contents", List.of(content));

        String response = geminiClient.post()
                .uri(uriBuilder -> uriBuilder
                        .path("/models/gemini-flash-latest:generateContent")
                        .queryParam("key", geminiApiKey)
                        .build())
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();

        try {
            JsonNode root = mapper.readTree(response);
            return root.at("/candidates/0/content/parts/0/text").asText();
        } catch (Exception e) {
            throw new AiApiException("Failed to parse Gemini text response", e);
        }
    }
}
