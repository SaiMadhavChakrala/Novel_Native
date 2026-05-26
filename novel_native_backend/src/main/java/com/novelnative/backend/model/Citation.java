package com.novelnative.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record Citation(
        String quote,
        @JsonProperty("chapter_title") String chapterTitle
) {
}
