package com.novelnative.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record MatchedChapter(
        String id,
        String title,
        String content,
        @JsonProperty("rrf_score") double rrfScore
) {
}
