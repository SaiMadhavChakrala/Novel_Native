import { NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { supabase } from '@/app/lib/supabase';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function getEmbeddingValues(embeddingResponse: Awaited<ReturnType<GoogleGenAI["models"]["embedContent"]>>): number[] {
  const values = embeddingResponse.embeddings?.[0]?.values;

  if (!values) {
    throw new Error("Gemini did not return embedding values.");
  }

  return values;
}

interface MatchedChapter {
  title: string;
  content: string;
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

    // 1. Generate query embedding (Updated model and dimensionality config)
    const embeddingResponse = await ai.models.embedContent({
      model: 'gemini-embedding-2', 
      contents: question,
      config: {
        outputDimensionality: 768, 
      }
    });
    
    // Extract the vector array
    const queryEmbedding = getEmbeddingValues(embeddingResponse);

    // 2. Hybrid Search (Vector + Keyword) & RRF Reranking
    const { data: matchedChapters, error } = await supabase.rpc('hybrid_search_chapters', {
      query_text: question,
      query_embedding: queryEmbedding,
      match_count: 3, 
      search_novel_id: novelId,
    });

    if (error || !matchedChapters || matchedChapters.length === 0) {
      // 👇 ADD THIS LINE SO WE CAN SEE THE CRASH IN THE TERMINAL 👇
      console.error("SUPABASE RETRIEVAL ERROR:", error); 
      return NextResponse.json({ answer: "I couldn't find any relevant lore in the chapters.", citations: [] });
    }

    // 3. Format Context
    const contextText = (matchedChapters as MatchedChapter[])
      .map((ch) => `[Chapter: ${ch.title}]\n${ch.content}`)
      .join("\n\n---\n\n");

    const prompt = `You are an enterprise-grade document assistant. Answer the user's question using ONLY the provided context. You MUST provide exact string quotes from the text as citations to prove your answer.\n\nContext:\n${contextText}\n\nQuestion: ${question}`;

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

    return NextResponse.json(result);
    
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    console.error("Enterprise RAG Error:", errorMessage);
    return NextResponse.json({ error: "Failed to process question" }, { status: 500 });
  }
}
