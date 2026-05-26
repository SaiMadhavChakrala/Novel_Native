package com.novelnative.backend.model;

import java.util.List;

public record AskNovelResponse(
        String answer,
        List<Citation> citations,
        NovelAccess access
) {
}
