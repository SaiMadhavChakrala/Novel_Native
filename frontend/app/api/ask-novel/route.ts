import { NextResponse } from 'next/server';
import { FunctionCallingConfigMode, GoogleGenAI, Type, Schema } from '@google/genai';
import { auth } from '@/app/auth';
import {
  createNovelMcpContext,
  getPublicToolTrace,
  novelMcpToolDeclarations,
  runNovelMcpTool,
  type NovelMcpContext,
  type NovelMcpToolExecution,
} from '@/app/lib/mcp/novelMcpTools';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface MatchedChapter {
  chapter_title: string;
  content: string;
  rrf_score: number;
}

interface SearchToolResult {
  matches?: MatchedChapter[];
}

// Enforce a strict JSON structure for the AI to return
const citationSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    answer: { 
      type: Type.STRING, 
      description: "The direct answer to the user's question based ONLY on context." 
    },
    citations: {
      type: Type.ARRAY,
      description: "Direct quotes from the context that prove your answer.",
      items: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING },
          chapter_title: { type: Type.STRING }
        },
      }
    }
  },
  required: ["answer", "citations"]
};

function getSearchMatches(execution: NovelMcpToolExecution | null): MatchedChapter[] {
  const result = execution?.result as SearchToolResult | undefined;
  return Array.isArray(result?.matches) ? result.matches : [];
}

function buildContextText(matches: MatchedChapter[]) {
  return matches
    .map((match) => `[Chapter: ${match.chapter_title}]\n${match.content}`)
    .join("\n\n---\n\n");
}

function parseChapterNumbers(question: string) {
  const chapterNumbers = new Set<number>();
  const matcher = /\bchapter\s+(\d+)\b/gi;
  let match = matcher.exec(question);

  while (match) {
    const chapterNumber = Number.parseInt(match[1], 10);
    if (Number.isInteger(chapterNumber) && chapterNumber > 0) {
      chapterNumbers.add(chapterNumber);
    }

    match = matcher.exec(question);
  }

  return Array.from(chapterNumbers).slice(0, 3);
}

function parseJsonResponse(text: string | undefined) {
  if (!text) {
    throw new Error("Model returned an empty response.");
  }

  return JSON.parse(text);
}

async function answerFromMatches(ctx: NovelMcpContext, question: string, matchedChapters: MatchedChapter[]) {
  const contextText = buildContextText(matchedChapters);
  const prompt = `You are an enterprise-grade document assistant for a ${ctx.access.plan} reader. Answer the user's question using ONLY the provided context. Do not infer from chapters outside this context. You MUST provide exact string quotes from the text as citations to prove your answer.\n\nContext:\n${contextText}\n\nQuestion: ${question}`;

  const completion = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: citationSchema,
      temperature: 0.1,
    }
  });

  return parseJsonResponse(completion.text);
}

async function collectAgentTools(ctx: NovelMcpContext, question: string) {
  const executions: NovelMcpToolExecution[] = [];
  const seen = new Set<string>();

  async function runOnce(name: string | undefined, args: Record<string, unknown>) {
    const key = `${name ?? "unknown"}:${JSON.stringify(args)}`;
    if (seen.has(key)) return;
    seen.add(key);

    const execution = await runNovelMcpTool(ctx, name, args);
    if (execution) {
      executions.push(execution);
    }
  }

  try {
    const planning = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Author question: ${question}`,
      config: {
        systemInstruction:
          "You are selecting MCP tools for an author continuity and lore agent. Call tools that provide evidence before answering. Use get_novel_outline for story structure, search_novel_lore for facts or continuity clues, and read_chapter when the user names a chapter number. Do not answer directly.",
        tools: [{ functionDeclarations: novelMcpToolDeclarations }],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.AUTO,
          },
        },
        temperature: 0,
      },
    });

    for (const functionCall of planning.functionCalls?.slice(0, 4) ?? []) {
      await runOnce(functionCall.name, functionCall.args ?? {});
    }
  } catch (error) {
    console.error("MCP tool planning failed:", error);
  }

  if (!executions.some((execution) => execution.name === "get_novel_outline")) {
    await runOnce("get_novel_outline", { include_drafts: true });
  }

  if (!executions.some((execution) => execution.name === "search_novel_lore")) {
    await runOnce("search_novel_lore", { query: question, match_count: 6 });
  }

  for (const chapterNumber of parseChapterNumbers(question)) {
    await runOnce("read_chapter", { chapter_number: chapterNumber, max_chars: 4500 });
  }

  return executions;
}

async function answerWithAgentTools(ctx: NovelMcpContext, question: string) {
  const toolExecutions = await collectAgentTools(ctx, question);
  const toolContext = JSON.stringify(
    toolExecutions.map((execution) => ({
      tool: execution.name,
      result: execution.result,
    })),
    null,
    2
  );

  const prompt = `You are the Author Copilot for "${ctx.novel.title}". You have already used server-side MCP tools to gather evidence. Answer the author's question using ONLY the MCP tool results below.

If the author asks for continuity or contradiction checking, give concrete findings, evidence, and suggested fixes. If the evidence is insufficient, say so plainly. Do not claim to save notes, update chapters, or perform writes.

MCP tool results:
${toolContext}

Question: ${question}`;

  const completion = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: citationSchema,
      temperature: 0.15,
    },
  });

  return {
    result: parseJsonResponse(completion.text),
    tools: toolExecutions,
  };
}

export async function POST(req: Request) {
  try {
    const { question, novelId, mode } = await req.json();

    if (typeof question !== "string" || !question.trim() || typeof novelId !== "string") {
      return NextResponse.json({ error: "Question and novelId are required." }, { status: 400 });
    }

    const trimmedQuestion = question.trim();
    const session = await auth();
    const ctx = await createNovelMcpContext(novelId, session, ai);

    if (mode === "agent") {
      if (!ctx.isAuthor) {
        return NextResponse.json({ error: "Author agent mode is only available to this novel's author." }, { status: 403 });
      }

      const agentAnswer = await answerWithAgentTools(ctx, trimmedQuestion);
      return NextResponse.json({
        ...agentAnswer.result,
        access: ctx.access,
        agentMode: true,
        tools: getPublicToolTrace(agentAnswer.tools),
      });
    }

    const searchExecution = await runNovelMcpTool(ctx, "search_novel_lore", {
      query: trimmedQuestion,
      match_count: 3,
    });
    const matchedChapters = getSearchMatches(searchExecution);

    if (matchedChapters.length === 0) {
      const normalPlanMessage = ctx.access.lockedChapterCount > 0
        ? `I couldn't find that in the first ${ctx.access.visibleChapterCount} of ${ctx.access.totalPublishedChapters} published chapters available to your plan.`
        : "I couldn't find any relevant lore in the chapters currently available to you.";

      return NextResponse.json({
        answer: ctx.access.plan === "premium"
          ? "I couldn't find any relevant lore in the published chapters."
          : normalPlanMessage,
        citations: [],
        access: ctx.access,
        agentMode: false,
      });
    }

    const result = await answerFromMatches(ctx, trimmedQuestion, matchedChapters);

    return NextResponse.json({ ...result, access: ctx.access, agentMode: false });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Enterprise RAG Error:", errorMessage);
    return NextResponse.json({ error: "Failed to process question" }, { status: 500 });
  }
}
