import "server-only";

import type { Session } from "next-auth";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";

export type UserPlan = "normal" | "premium";

export interface ChapterListItem {
  chapter_number: number;
  title: string;
}

export interface NovelAccess {
  plan: UserPlan;
  totalPublishedChapters: number;
  accessibleChapterCount: number | null;
  visibleChapterCount: number;
  lockedChapterCount: number;
}

function normalizePlan(plan: unknown): UserPlan {
  return plan === "premium" ? "premium" : "normal";
}

function normalVisibleChapterCount(totalPublishedChapters: number) {
  return Math.ceil(totalPublishedChapters / 2);
}

function visibleChapterCountForPlan(totalPublishedChapters: number, plan: UserPlan) {
  if (plan === "premium") {
    return totalPublishedChapters;
  }

  return normalVisibleChapterCount(totalPublishedChapters);
}

export async function getUserPlan(session: Session | null): Promise<UserPlan> {
  if (!session?.user?.id) {
    return "normal";
  }

  const supabase = getSupabaseAdmin();
  const userId = session.user.id;
  const email = session.user.email ?? null;
  const displayName = session.user.name ?? null;

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }

  if (profile) {
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({
        email,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      console.error("Failed to refresh user profile metadata:", updateError);
    }

    return normalizePlan(profile.plan);
  }

  const { data: insertedProfile, error: insertError } = await supabase
    .from("user_profiles")
    .insert({
      id: userId,
      email,
      display_name: displayName,
      plan: "normal",
    })
    .select("plan")
    .single();

  if (insertError) {
    const { data: existingProfile, error: retryError } = await supabase
      .from("user_profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();

    if (retryError || !existingProfile) {
      throw new Error(`Failed to create user profile: ${insertError.message}`);
    }

    return normalizePlan(existingProfile.plan);
  }

  return normalizePlan(insertedProfile.plan);
}

export async function getPublishedChapterCount(novelId: string) {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("chapters")
    .select("id", { count: "exact", head: true })
    .eq("novel_id", novelId)
    .eq("is_published", true);

  if (error) {
    throw new Error(`Failed to count published chapters: ${error.message}`);
  }

  return count ?? 0;
}

export async function getNovelAccess(novelId: string, session: Session | null): Promise<NovelAccess> {
  const [plan, totalPublishedChapters] = await Promise.all([
    getUserPlan(session),
    getPublishedChapterCount(novelId),
  ]);

  const visibleChapterCount = visibleChapterCountForPlan(totalPublishedChapters, plan);

  return {
    plan,
    totalPublishedChapters,
    accessibleChapterCount: plan === "premium" ? null : visibleChapterCount,
    visibleChapterCount,
    lockedChapterCount: Math.max(totalPublishedChapters - visibleChapterCount, 0),
  };
}

export async function getAccessiblePublishedChapters(novelId: string, session: Session | null) {
  const supabase = getSupabaseAdmin();

  const [plan, chaptersResult] = await Promise.all([
    getUserPlan(session),
    supabase
      .from("chapters")
      .select("chapter_number, title")
      .eq("novel_id", novelId)
      .eq("is_published", true)
      .order("chapter_number", { ascending: true }),
  ]);

  if (chaptersResult.error) {
    throw new Error(`Failed to fetch published chapters: ${chaptersResult.error.message}`);
  }

  const publishedChapters = (chaptersResult.data ?? []) as ChapterListItem[];
  const visibleChapterCount = visibleChapterCountForPlan(publishedChapters.length, plan);
  const accessibleChapters = publishedChapters.slice(0, visibleChapterCount);

  return {
    plan,
    publishedChapters,
    accessibleChapters,
    totalPublishedChapters: publishedChapters.length,
    accessibleChapterCount: plan === "premium" ? null : visibleChapterCount,
    visibleChapterCount,
    lockedChapterCount: Math.max(publishedChapters.length - visibleChapterCount, 0),
  };
}
