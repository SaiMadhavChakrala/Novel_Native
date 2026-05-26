package com.novelnative.backend.api;

import com.novelnative.backend.model.AskNovelRequest;
import com.novelnative.backend.model.AskNovelResponse;
import com.novelnative.backend.service.AskNovelService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class AskNovelController {

    private final AskNovelService askNovelService;

    public AskNovelController(AskNovelService askNovelService) {
        this.askNovelService = askNovelService;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok");
    }

    @PostMapping("/ask-novel")
    public AskNovelResponse askNovel(@Valid @RequestBody AskNovelRequest request) {
        return askNovelService.ask(request);
    }
}
