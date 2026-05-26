package com.novelnative.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novelnative.backend.config.AppProperties;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.StreamSupport;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class GeminiClient {

    private static final String GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

    private final AppProperties properties;
    private final ObjectMapper objectMapper;
    private final WebClient webClient;

    public GeminiClient(AppProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
        this.webClient = WebClient.builder()
                .baseUrl(GEMINI_BASE_URL)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public List<Double> embed(String text) {
        String modelResource = modelResource(properties.gemini().embeddingModel());
        Map<String, Object> body = Map.of(
                "model", modelResource,
                "content", Map.of("parts", List.of(Map.of("text", text))),
                "outputDimensionality", properties.gemini().embeddingOutputDimensionality()
        );

        JsonNode response = webClient.post()
                .uri("/" + modelResource + ":embedContent")
                .headers(this::addGeminiHeaders)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        JsonNode values = embeddingValues(response);
        if (values == null || !values.isArray()) {
            throw new IllegalStateException("Gemini did not return embedding values.");
        }

        return StreamSupport.stream(values.spliterator(), false)
                .map(JsonNode::asDouble)
                .toList();
    }

    public JsonNode generateJson(String prompt, Map<String, Object> responseSchema) {
        String modelResource = modelResource(properties.gemini().generationModel());
        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt)))),
                "generationConfig", Map.of(
                        "responseMimeType", "application/json",
                        "responseSchema", responseSchema,
                        "temperature", 0.1
                )
        );

        JsonNode response = webClient.post()
                .uri("/" + modelResource + ":generateContent")
                .headers(this::addGeminiHeaders)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        String text = generatedText(response);
        try {
            return objectMapper.readTree(text);
        } catch (Exception firstFailure) {
            try {
                return objectMapper.readTree(stripMarkdownFence(text));
            } catch (Exception secondFailure) {
                throw new IllegalStateException("Gemini did not return valid JSON.", secondFailure);
            }
        }
    }

    private JsonNode embeddingValues(JsonNode response) {
        if (response == null) {
            return null;
        }

        JsonNode singleEmbedding = response.at("/embedding/values");
        if (!singleEmbedding.isMissingNode()) {
            return singleEmbedding;
        }

        JsonNode sdkStyleEmbedding = response.at("/embeddings/0/values");
        return sdkStyleEmbedding.isMissingNode() ? null : sdkStyleEmbedding;
    }

    private String generatedText(JsonNode response) {
        JsonNode text = response == null ? null : response.at("/candidates/0/content/parts/0/text");
        if (text == null || text.isMissingNode() || !StringUtils.hasText(text.asText())) {
            throw new IllegalStateException("Gemini did not return generated text.");
        }

        return text.asText();
    }

    private String stripMarkdownFence(String text) {
        String trimmed = text == null ? "" : text.trim();
        if (!trimmed.startsWith("```")) {
            return trimmed;
        }

        return trimmed
                .replaceFirst("^```(?:json)?\\s*", "")
                .replaceFirst("\\s*```$", "")
                .trim();
    }

    private void addGeminiHeaders(HttpHeaders headers) {
        String apiKey = properties.gemini() == null ? "" : properties.gemini().apiKey();
        if (!StringUtils.hasText(apiKey)) {
            throw new IllegalStateException("GEMINI_API_KEY is required.");
        }

        headers.set("x-goog-api-key", apiKey);
    }

    private String modelResource(String modelName) {
        if (!StringUtils.hasText(modelName)) {
            throw new IllegalStateException("Gemini model name is required.");
        }

        String trimmed = modelName.trim();
        return trimmed.startsWith("models/") ? trimmed : "models/" + trimmed;
    }
}
