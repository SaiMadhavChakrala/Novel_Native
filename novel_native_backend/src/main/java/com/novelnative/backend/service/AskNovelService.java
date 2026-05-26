package com.novelnative.backend.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.novelnative.backend.model.AskNovelRequest;
import com.novelnative.backend.model.AskNovelResponse;
import com.novelnative.backend.model.GeneratedAnswer;
import com.novelnative.backend.model.MatchedChapter;
import com.novelnative.backend.model.NovelAccess;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class AskNovelService {

    private static final int MATCH_COUNT = 3;

    private final GeminiClient geminiClient;
    private final ObjectMapper objectMapper;
    private final SupabaseClient supabaseClient;
    private final UserAccessService userAccessService;

    public AskNovelService(
            GeminiClient geminiClient,
            ObjectMapper objectMapper,
            SupabaseClient supabaseClient,
            UserAccessService userAccessService
    ) {
        this.geminiClient = geminiClient;
        this.objectMapper = objectMapper;
        this.supabaseClient = supabaseClient;
        this.userAccessService = userAccessService;
    }

    public AskNovelResponse ask(AskNovelRequest request) {
        String question = request.question().trim();
        String novelId = request.novelId().trim();

        NovelAccess access = userAccessService.getNovelAccess(novelId, request.user());
        List<Double> queryEmbedding = geminiClient.embed(question);
        List<MatchedChapter> matchedChapters = supabaseClient.hybridSearchChapters(
                question,
                queryEmbedding,
                MATCH_COUNT,
                novelId,
                access.accessibleChapterCount()
        );

        if (matchedChapters.isEmpty()) {
            return noRelevantLoreResponse(access);
        }

        String contextText = formatContext(matchedChapters);
        String prompt = """
                You are an enterprise-grade document assistant for a %s reader. Answer the user's question using ONLY the provided context. Do not infer from chapters outside this context. You MUST provide exact string quotes from the text as citations to prove your answer.

                Context:
                %s

                Question: %s
                """.formatted(access.plan(), contextText, question);

        JsonNode completionJson = geminiClient.generateJson(prompt, citationSchema());
        GeneratedAnswer generatedAnswer = objectMapper.convertValue(completionJson, GeneratedAnswer.class);

        return new AskNovelResponse(
                generatedAnswer.answer(),
                generatedAnswer.citations() == null ? Collections.emptyList() : generatedAnswer.citations(),
                access
        );
    }

    private AskNovelResponse noRelevantLoreResponse(NovelAccess access) {
        String normalPlanMessage = access.lockedChapterCount() > 0
                ? "I couldn't find that in the first %d of %d published chapters available to your plan."
                .formatted(access.visibleChapterCount(), access.totalPublishedChapters())
                : "I couldn't find any relevant lore in the chapters currently available to you.";

        String answer = "premium".equals(access.plan())
                ? "I couldn't find any relevant lore in the published chapters."
                : normalPlanMessage;

        return new AskNovelResponse(answer, Collections.emptyList(), access);
    }

    private String formatContext(List<MatchedChapter> matchedChapters) {
        return matchedChapters.stream()
                .map(chapter -> "[Chapter: %s]%n%s".formatted(chapter.title(), chapter.content()))
                .reduce((left, right) -> left + "\n\n---\n\n" + right)
                .orElse("");
    }

    private Map<String, Object> citationSchema() {
        return Map.of(
                "type", "OBJECT",
                "properties", Map.of(
                        "answer", Map.of(
                                "type", "STRING",
                                "description", "The direct answer to the user's question based ONLY on context."
                        ),
                        "citations", Map.of(
                                "type", "ARRAY",
                                "description", "Direct quotes from the context that prove your answer.",
                                "items", Map.of(
                                        "type", "OBJECT",
                                        "properties", Map.of(
                                                "quote", Map.of("type", "STRING"),
                                                "chapter_title", Map.of("type", "STRING")
                                        ),
                                        "required", List.of("quote", "chapter_title")
                                )
                        )
                ),
                "required", List.of("answer", "citations")
        );
    }
}
