package com.novelnative.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Supabase supabase,
        Gemini gemini,
        Cors cors
) {
    public record Supabase(
            String url,
            String serviceRoleKey
    ) {
    }

    public record Gemini(
            String apiKey,
            String embeddingModel,
            String generationModel,
            int embeddingOutputDimensionality
    ) {
    }

    public record Cors(
            String allowedOrigins
    ) {
    }
}
