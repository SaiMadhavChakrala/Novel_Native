package com.novelnative.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record NovelAccess(
        String plan,
        @JsonProperty("totalPublishedChapters") int totalPublishedChapters,
        @JsonProperty("accessibleChapterCount") Integer accessibleChapterCount,
        @JsonProperty("visibleChapterCount") int visibleChapterCount,
        @JsonProperty("lockedChapterCount") int lockedChapterCount
) {
}
