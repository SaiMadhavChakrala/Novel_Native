package com.novelnative.backend.model;

import java.util.List;

public record GeneratedAnswer(
        String answer,
        List<Citation> citations
) {
}
