package com.novelnative.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.novelnative.backend.config.AppProperties;
import com.novelnative.backend.model.MatchedChapter;
import com.novelnative.backend.model.UserContext;
import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;

@Component
public class SupabaseClient {

    private final AppProperties properties;
    private final WebClient webClient;

    public SupabaseClient(AppProperties properties) {
        this.properties = properties;
        this.webClient = WebClient.builder()
                .baseUrl(restBaseUrl(properties.supabase() == null ? "" : properties.supabase().url()))
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    public int countPublishedChapters(String novelId) {
        JsonNode response = webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/chapters")
                        .queryParam("select", "id")
                        .queryParam("novel_id", "eq." + novelId)
                        .queryParam("is_published", "eq.true")
                        .build())
                .headers(this::addSupabaseHeaders)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        return response == null || !response.isArray() ? 0 : response.size();
    }

    public Optional<String> findUserPlan(String userId) {
        JsonNode response = webClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/user_profiles")
                        .queryParam("select", "plan")
                        .queryParam("id", "eq." + userId)
                        .build())
                .headers(this::addSupabaseHeaders)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        if (response == null || !response.isArray() || response.isEmpty()) {
            return Optional.empty();
        }

        JsonNode plan = response.get(0).get("plan");
        return plan == null || plan.isNull() ? Optional.empty() : Optional.of(plan.asText());
    }

    public void updateUserProfileMetadata(UserContext user) {
        if (!StringUtils.hasText(user.id())) {
            return;
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("email", user.email());
        body.put("display_name", user.name());
        body.put("updated_at", OffsetDateTime.now().toString());

        webClient.patch()
                .uri(uriBuilder -> uriBuilder
                        .path("/user_profiles")
                        .queryParam("id", "eq." + user.id())
                        .build())
                .headers(this::addSupabaseHeaders)
                .header("Prefer", "return=minimal")
                .bodyValue(body)
                .retrieve()
                .toBodilessEntity()
                .block();
    }

    public Optional<String> insertNormalUserProfile(UserContext user) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("id", user.id());
        body.put("email", user.email());
        body.put("display_name", user.name());
        body.put("plan", "normal");

        JsonNode response = webClient.post()
                .uri("/user_profiles")
                .headers(this::addSupabaseHeaders)
                .header("Prefer", "return=representation")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(JsonNode.class)
                .block();

        if (response == null || !response.isArray() || response.isEmpty()) {
            return Optional.of("normal");
        }

        JsonNode plan = response.get(0).get("plan");
        return Optional.of(plan == null || plan.isNull() ? "normal" : plan.asText());
    }

    public List<MatchedChapter> hybridSearchChapters(
            String queryText,
            List<Double> queryEmbedding,
            int matchCount,
            String novelId,
            Integer accessibleChapterCount
    ) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("query_text", queryText);
        body.put("query_embedding", queryEmbedding);
        body.put("match_count", matchCount);
        body.put("search_novel_id", novelId);
        body.put("accessible_chapter_count", accessibleChapterCount);

        List<MatchedChapter> response = webClient.post()
                .uri("/rpc/hybrid_search_chapters")
                .headers(this::addSupabaseHeaders)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(new ParameterizedTypeReference<List<MatchedChapter>>() {
                })
                .block();

        return response == null ? Collections.emptyList() : response;
    }

    private void addSupabaseHeaders(HttpHeaders headers) {
        String serviceRoleKey = properties.supabase() == null ? "" : properties.supabase().serviceRoleKey();
        requireText(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY is required.");
        headers.set("apikey", serviceRoleKey);
        headers.setBearerAuth(serviceRoleKey);
    }

    private String restBaseUrl(String supabaseUrl) {
        requireText(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is required.");
        String trimmedUrl = supabaseUrl.trim();
        if (trimmedUrl.endsWith("/")) {
            trimmedUrl = trimmedUrl.substring(0, trimmedUrl.length() - 1);
        }

        return trimmedUrl + "/rest/v1";
    }

    private void requireText(String value, String message) {
        if (!StringUtils.hasText(value)) {
            throw new IllegalStateException(message);
        }
    }
}
