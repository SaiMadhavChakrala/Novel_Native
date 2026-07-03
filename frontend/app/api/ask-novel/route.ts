import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { auth } from '@/app/auth';
import { getSupabaseAdmin } from '@/app/lib/supabaseAdmin';
import { getNovelAccess } from '@/app/lib/userAccess';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function getEmbeddingValues(embeddingResponse: Awaited<ReturnType<GoogleGenAI["models"]["embedContent"]>>): number[] {
  const values = embeddingResponse.embeddings?.[0]?.values;

  if (!values) {
    throw new Error("Gemini did not return embedding values.");
  }

  return values;
}

interface MatchedChapter {
  id: string;
  title: string;
  content: string;
  rrf_score: number;
}

interface HybridSearchRpcClient {
  rpc(
    functionName: "hybrid_search_chapters",
    args: {
      query_text: string;
      query_embedding: number[];
      match_count: number;
      search_novel_id: string;
      accessible_chapter_count: number | null;
    }
  ): Promise<{
    data: MatchedChapter[] | null;
    error: { message: string } | null;
  }>;
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

export async function POST(req: Request) {
  try {
    const { question, novelId } = await req.json();

    if (typeof question !== "string" || !question.trim() || typeof novelId !== "string") {
      return NextResponse.json({ error: "Question and novelId are required." }, { status: 400 });
    }

    const session = await auth();
    const access = await getNovelAccess(novelId, session);
    const supabase = getSupabaseAdmin() as unknown as HybridSearchRpcClient;

    // 1. Generate query embedding (Updated model and dimensionality config)
    const embeddingResponse = await ai.models.embedContent({
      model: 'gemini-embedding-2', 
      contents: question.trim(),
      config: {
        outputDimensionality: 768, 
      }
    });
    
    // Extract the vector array
    const queryEmbedding = getEmbeddingValues(embeddingResponse);

    // 2. Hybrid Search (Vector + Keyword) & RRF Reranking
    const { data: matchedChapters, error } = await supabase.rpc('hybrid_search_chapters', {
      query_text: question.trim(),
      query_embedding: queryEmbedding,
      match_count: 3, 
      search_novel_id: novelId,
      accessible_chapter_count: access.accessibleChapterCount,
    });

    if (error || !matchedChapters || matchedChapters.length === 0) {
      // 👇 ADD THIS LINE SO WE CAN SEE THE CRASH IN THE TERMINAL 👇
      console.error("SUPABASE RETRIEVAL ERROR:", error); 
      const normalPlanMessage = access.lockedChapterCount > 0
        ? `I couldn't find that in the first ${access.visibleChapterCount} of ${access.totalPublishedChapters} published chapters available to your plan.`
        : "I couldn't find any relevant lore in the chapters currently available to you.";

      return NextResponse.json({
        answer: access.plan === "premium"
          ? "I couldn't find any relevant lore in the published chapters."
          : normalPlanMessage,
        citations: [],
        access,
      });
    }

    // 3. Format Context
    const contextText = (matchedChapters as MatchedChapter[])
      .map((ch) => `[Chapter: ${ch.title}]\n${ch.content}`)
      .join("\n\n---\n\n");

    const prompt = `You are an enterprise-grade document assistant for a ${access.plan} reader. Answer the user's question using ONLY the provided context. Do not infer from chapters outside this context. You MUST provide exact string quotes from the text as citations to prove your answer.\n\nContext:\n${contextText}\n\nQuestion: ${question.trim()}`;

    // 4. Generate with Strict Schema Enforcement
    const completion = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: citationSchema,
        temperature: 0.1, 
      }
    });

    // Parse the JSON result
    const result = JSON.parse(completion.text!);

    return NextResponse.json({ ...result, access });
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Enterprise RAG Error:", errorMessage);
    return NextResponse.json({ error: "Failed to process question" }, { status: 500 });
  }
}
