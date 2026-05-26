package com.novelnative.backend.model;

import jakarta.validation.constraints.NotBlank;

public record AskNovelRequest(
        @NotBlank(message = "Question is required.") String question,
        @NotBlank(message = "novelId is required.") String novelId,
        UserContext user
) {
}
