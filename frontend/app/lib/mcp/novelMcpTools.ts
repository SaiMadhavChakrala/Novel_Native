import "server-only";

import { GoogleGenAI, Type, type FunctionDeclaration } from "@google/genai";
import type { Session } from "next-auth";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSessionAuthorIds, syncAuthorIdentity } from "@/app/lib/authorIdentity";
import type { Database } from "@/app/lib/database.types";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import { getNovelAccess, type NovelAccess } from "@/app/lib/userAccess";

const EMBEDDING_MODEL = "gemini-embedding-2";
const EMBEDDING_DIMENSIONS = 768;

type NovelRow = Database["public"]["Tables"]["novels"]["Row"];
type ChapterRow = Pick<
  Database["public"]["Tables"]["chapters"]["Row"],
  "id" | "chapter_number" | "title" | "content" | "is_published" | "updated_at"
>;

export type NovelMcpToolName = "get_novel_outline" | "search_novel_lore" | "read_chapter";

export interface NovelMcpContext {
  ai: GoogleGenAI;
  access: NovelAccess;
  isAuthor: boolean;
  novel: NovelRow;
  novelId: string;
  session: Session | null;
  supabase: SupabaseClient<Database>;
}

export interface NovelMcpToolExecution {
  arguments: Record<string, unknown>;
  displayName: string;
  name: NovelMcpToolName;
  result: unknown;
  summary: string;
}

interface HybridSearchMatch {
  id: string;
  title: string;
  content: string;
  rrf_score: number;
}

interface HybridSearchRpcClient {
  rpc(
    functionName: "hybrid_search_chapters",
    args: {
      accessible_chapter_count: number | null;
      match_count: number;
      query_embedding: number[];
      query_text: string;
      search_novel_id: string;
    }
  ): Promise<{
    data: HybridSearchMatch[] | null;
    error: { message: string } | null;
  }>;
}

export const novelMcpToolDeclarations: FunctionDeclaration[] = [
  {
    name: "get_novel_outline",
    description:
      "Read the novel metadata and ordered chapter outline. Authors may include draft chapters; readers only see accessible published chapters.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        include_drafts: {
          type: Type.BOOLEAN,
          description: "Whether to include draft/unpublished chapters. Only honored for the author.",
        },
      },
    },
  },
  {
    name: "search_novel_lore",
    description:
      "Run hybrid semantic and keyword lore search over indexed published chapter chunks for this novel.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "The focused lore or continuity search query.",
        },
        match_count: {
          type: Type.INTEGER,
          description: "Number of relevant chunks to retrieve. Must be between 1 and 8.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "read_chapter",
    description:
      "Read one chapter by chapter number. Authors may read drafts; readers only read accessible published chapters.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        chapter_number: {
          type: Type.INTEGER,
          description: "The chapter number to inspect.",
        },
        max_chars: {
          type: Type.INTEGER,
          description: "Maximum characters of chapter content to return, between 500 and 6000.",
        },
      },
      required: ["chapter_number"],
    },
  },
];

export const novelMcpHttpToolDefinitions = [
  {
    name: "get_novel_outline",
    title: "Novel outline",
    description:
      "Read novel metadata and the ordered chapter outline. Authors may include draft chapters; readers only see accessible published chapters.",
    inputSchema: {
      type: "object",
      properties: {
        novel_id: {
          type: "string",
          description: "The novel UUID to inspect.",
        },
        include_drafts: {
          type: "boolean",
          description: "Whether to include draft/unpublished chapters. Only honored for the author.",
        },
      },
      required: ["novel_id"],
      additionalProperties: false,
    },
  },
  {
    name: "search_novel_lore",
    title: "Lore search",
    description:
      "Run hybrid semantic and keyword lore search over indexed published chapter chunks for one novel.",
    inputSchema: {
      type: "object",
      properties: {
        novel_id: {
          type: "string",
          description: "The novel UUID to search.",
        },
        query: {
          type: "string",
          description: "The focused lore or continuity search query.",
        },
        match_count: {
          type: "integer",
          minimum: 1,
          maximum: 8,
          description: "Number of relevant chunks to retrieve.",
        },
      },
      required: ["novel_id", "query"],
      additionalProperties: false,
    },
  },
  {
    name: "read_chapter",
    title: "Read chapter",
    description:
      "Read one chapter by chapter number. Authors may read drafts; readers only read accessible published chapters.",
    inputSchema: {
      type: "object",
      properties: {
        novel_id: {
          type: "string",
          description: "The novel UUID that owns the chapter.",
        },
        chapter_number: {
          type: "integer",
          minimum: 1,
          description: "The chapter number to inspect.",
        },
        max_chars: {
          type: "integer",
          minimum: 500,
          maximum: 6000,
          description: "Maximum characters of chapter content to return.",
        },
      },
      required: ["novel_id", "chapter_number"],
      additionalProperties: false,
    },
  },
] as const;

const toolDisplayNames: Record<NovelMcpToolName, string> = {
  get_novel_outline: "Novel outline",
  read_chapter: "Read chapter",
  search_novel_lore: "Lore search",
};

function isNovelMcpToolName(name: string | undefined): name is NovelMcpToolName {
  return name === "get_novel_outline" || name === "search_novel_lore" || name === "read_chapter";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asBoolean(value: unknown) {
  return value === true;
}

function asClampedInteger(value: unknown, fallback: number, min: number, max: number) {
  const numeric = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(Math.max(Math.trunc(numeric), min), max);
}

function truncateText(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return { text, truncated: false };
  }

  return {
    text: `${text.slice(0, maxChars).trimEnd()}\n\n[Truncated]`,
    truncated: true,
  };
}

function getEmbeddingValues(embeddingResponse: Awaited<ReturnType<GoogleGenAI["models"]["embedContent"]>>): number[] {
  const values = embeddingResponse.embeddings?.[0]?.values;

  if (!values) {
    throw new Error("Gemini did not return embedding values.");
  }

  return values;
}

async function getReadableChapters(ctx: NovelMcpContext, includeDrafts: boolean): Promise<ChapterRow[]> {
  let query = ctx.supabase
    .from("chapters")
    .select("id, chapter_number, title, content, is_published, updated_at")
    .eq("novel_id", ctx.novelId)
    .order("chapter_number", { ascending: true });

  if (!ctx.isAuthor || !includeDrafts) {
    query = query.eq("is_published", true);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch chapters: ${error.message}`);
  }

  const chapters = (data ?? []) as ChapterRow[];

  if (ctx.isAuthor || ctx.access.accessibleChapterCount === null) {
    return chapters;
  }

  return chapters.slice(0, ctx.access.accessibleChapterCount);
}

export async function createNovelMcpContext(
  novelId: string,
  session: Session | null,
  ai: GoogleGenAI
): Promise<NovelMcpContext> {
  const supabase = getSupabaseAdmin();

  if (session?.user?.id) {
    await syncAuthorIdentity(session);
  }

  const [access, novelResult] = await Promise.all([
    getNovelAccess(novelId, session),
    supabase
      .from("novels")
      .select("id, author_id, title, description, cover_url, status, genre, created_at, updated_at")
      .eq("id", novelId)
      .single(),
  ]);

  if (novelResult.error || !novelResult.data) {
    throw new Error("Novel not found.");
  }

  const authorIds = getSessionAuthorIds(session);
  const novel = novelResult.data as NovelRow;

  return {
    access,
    ai,
    isAuthor: authorIds.includes(novel.author_id),
    novel,
    novelId,
    session,
    supabase,
  };
}

async function getNovelOutline(ctx: NovelMcpContext, rawArgs: Record<string, unknown>) {
  const includeDrafts = ctx.isAuthor && asBoolean(rawArgs.include_drafts);
  const chapters = await getReadableChapters(ctx, includeDrafts);

  const result = {
    access: {
      lockedChapterCount: ctx.isAuthor ? 0 : ctx.access.lockedChapterCount,
      plan: ctx.access.plan,
      visibleChapterCount: ctx.isAuthor ? chapters.length : ctx.access.visibleChapterCount,
    },
    is_author: ctx.isAuthor,
    novel: {
      description: ctx.novel.description,
      genre: ctx.novel.genre ?? [],
      status: ctx.novel.status,
      title: ctx.novel.title,
    },
    chapters: chapters.map((chapter) => ({
      chapter_number: chapter.chapter_number,
      is_published: Boolean(chapter.is_published),
      title: chapter.title,
      updated_at: chapter.updated_at,
    })),
  };

  return {
    result,
    summary: `Loaded outline for ${result.chapters.length} chapter${result.chapters.length === 1 ? "" : "s"}.`,
  };
}

async function searchNovelLore(ctx: NovelMcpContext, rawArgs: Record<string, unknown>) {
  const query = asString(rawArgs.query);
  const matchCount = asClampedInteger(rawArgs.match_count, 5, 1, 8);

  if (!query) {
    return {
      result: { error: "A non-empty query is required.", matches: [] },
      summary: "Lore search skipped because no query was provided.",
    };
  }

  const embeddingResponse = await ctx.ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: query,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  const { data, error } = await (ctx.supabase as unknown as HybridSearchRpcClient).rpc("hybrid_search_chapters", {
    accessible_chapter_count: ctx.isAuthor ? null : ctx.access.accessibleChapterCount,
    match_count: matchCount,
    query_embedding: getEmbeddingValues(embeddingResponse),
    query_text: query,
    search_novel_id: ctx.novelId,
  });

  if (error) {
    throw new Error(`Lore search failed: ${error.message}`);
  }

  const matches = (data ?? []).map((match) => ({
    chapter_title: match.title,
    content: match.content,
    rrf_score: match.rrf_score,
  }));

  return {
    result: {
      query,
      matches,
      note: ctx.isAuthor
        ? "Search covers indexed published chunks. Draft chapters are not indexed until published."
        : "Search is limited to chapters available to this reader.",
    },
    summary: `Retrieved ${matches.length} lore match${matches.length === 1 ? "" : "es"}.`,
  };
}

async function readChapter(ctx: NovelMcpContext, rawArgs: Record<string, unknown>) {
  const chapterNumber = asClampedInteger(rawArgs.chapter_number, 0, 1, 10000);
  const maxChars = asClampedInteger(rawArgs.max_chars, 3500, 500, 6000);

  if (!chapterNumber) {
    return {
      result: { error: "A valid chapter_number is required." },
      summary: "Chapter read skipped because no valid chapter number was provided.",
    };
  }

  const chapters = await getReadableChapters(ctx, true);
  const chapter = chapters.find((candidate) => candidate.chapter_number === chapterNumber);

  if (!chapter) {
    return {
      result: {
        chapter_number: chapterNumber,
        error: ctx.isAuthor
          ? "Chapter not found in this novel."
          : "Chapter not found or not available to this reader.",
      },
      summary: `Chapter ${chapterNumber} was not readable.`,
    };
  }

  const content = truncateText(chapter.content, maxChars);

  return {
    result: {
      chapter_number: chapter.chapter_number,
      content: content.text,
      is_published: Boolean(chapter.is_published),
      title: chapter.title,
      truncated: content.truncated,
    },
    summary: `Read chapter ${chapter.chapter_number}: ${chapter.title}.`,
  };
}

export async function runNovelMcpTool(
  ctx: NovelMcpContext,
  name: string | undefined,
  args: unknown
): Promise<NovelMcpToolExecution | null> {
  if (!isNovelMcpToolName(name)) {
    return null;
  }

  const parsedArgs = asRecord(args);
  const execution =
    name === "get_novel_outline"
      ? await getNovelOutline(ctx, parsedArgs)
      : name === "search_novel_lore"
        ? await searchNovelLore(ctx, parsedArgs)
        : await readChapter(ctx, parsedArgs);

  return {
    arguments: parsedArgs,
    displayName: toolDisplayNames[name],
    name,
    result: execution.result,
    summary: execution.summary,
  };
}

export function getPublicToolTrace(executions: NovelMcpToolExecution[]) {
  return executions.map((execution) => ({
    name: execution.name,
    displayName: execution.displayName,
    summary: execution.summary,
  }));
}
