package com.novelnative.backend.service;

import com.novelnative.backend.model.NovelAccess;
import com.novelnative.backend.model.UserContext;
import com.novelnative.backend.model.UserPlan;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class UserAccessService {

    private final SupabaseClient supabaseClient;

    public UserAccessService(SupabaseClient supabaseClient) {
        this.supabaseClient = supabaseClient;
    }

    public NovelAccess getNovelAccess(String novelId, UserContext user) {
        UserPlan plan = getUserPlan(user);
        int totalPublishedChapters = supabaseClient.countPublishedChapters(novelId);
        int visibleChapterCount = visibleChapterCountForPlan(totalPublishedChapters, plan);

        return new NovelAccess(
                plan.jsonValue(),
                totalPublishedChapters,
                plan == UserPlan.PREMIUM ? null : visibleChapterCount,
                visibleChapterCount,
                Math.max(totalPublishedChapters - visibleChapterCount, 0)
        );
    }

    private UserPlan getUserPlan(UserContext user) {
        if (user == null || !StringUtils.hasText(user.id())) {
            return UserPlan.NORMAL;
        }

        Optional<String> existingPlan = supabaseClient.findUserPlan(user.id());
        if (existingPlan.isPresent()) {
            supabaseClient.updateUserProfileMetadata(user);
            return UserPlan.fromDatabaseValue(existingPlan.get());
        }

        return UserPlan.fromDatabaseValue(supabaseClient.insertNormalUserProfile(user).orElse("normal"));
    }

    private int visibleChapterCountForPlan(int totalPublishedChapters, UserPlan plan) {
        if (plan == UserPlan.PREMIUM) {
            return totalPublishedChapters;
        }

        return (int) Math.ceil(totalPublishedChapters / 2.0);
    }
}
