// frontend/app/actions/authorActions.ts
'use server'

import { auth } from "@/app/auth"; 
import { supabase } from "@/app/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { GoogleGenAI } from '@google/genai'; // Added missing Gemini import

/**
 * 1. CREATE NOVEL LOGIC
 */
export async function createNovelAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in to create a novel.");

  const userId = session.user.id;

  const { data: author } = await supabase
    .from("authors")
    .select("id")
    .eq("id", userId)
    .single();

  if (!author) {
    return { error: "Please register as an author first." };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const status = formData.get("status") as string || "Ongoing";

  const genresString = formData.get("genres") as string;
  const genreArray = genresString 
    ? genresString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    : [];

  const { data, error } = await supabase
    .from("novels")
    .insert({
      author_id: userId,
      title,
      description,
      status,
      genre: genreArray, 
    })
    .select('id')
    .single();

  if (error) {
    console.error("Database Error:", error);
    return { error: "Failed to create novel. Please try again." };
  }

  revalidatePath("/author");
  revalidatePath("/novels"); 
  redirect(`/author/novels/${data.id}/add-chapter`);
}

/**
 * 2. AUTHOR REGISTRATION LOGIC
 */
export async function registerAuthorAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");

  const penName = formData.get("pen_name") as string;
  const bio = formData.get("bio") as string;

  const { error } = await supabase
    .from("authors")
    .insert({
      id: session.user.id,
      pen_name: penName,
      bio: bio,
      avatar_url: session.user.image || null,
    });

  if (error) {
    console.error("Database Error:", error);
    return { error: "Failed to register. Pen name might be taken or database error." };
  }

  revalidatePath("/author");
  redirect("/author");
}

/**
 * HELPER: Recursive-style Overlap Chunking Algorithm
 */
function getOverlapChunks(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += (chunkSize - overlap); // Step forward, leaving the overlap behind
  }
  return chunks;
}

/**
 * 3. ADD CHAPTER LOGIC (With Advanced Overlap Chunking)
 */
export async function addChapterAction(novelId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("You must be logged in.");

  const userId = session.user.id;

  const { data: novel, error: novelError } = await supabase
    .from("novels")
    .select("author_id")
    .eq("id", novelId)
    .single();

  if (novelError || !novel) throw new Error("Novel not found.");
  if (novel.author_id !== userId) throw new Error("Unauthorized: You can only add chapters to your own novels.");

  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const chapterNumber = parseInt(formData.get("chapterNumber") as string);
  const isPublished = formData.get("isPublished") === "true";

  // 1. SAVE THE CHAPTER TEXT FIRST (So readers can read it)
  // Notice we are no longer saving an embedding to the 'chapters' table
  const { data: newChapter, error: insertError } = await supabase
    .from("chapters")
    .insert({
      novel_id: novelId,
      title,
      content,
      chapter_number: chapterNumber,
      is_published: isPublished,
    })
    .select("id")
    .single();

  if (insertError || !newChapter) {
    console.error("Database Error:", insertError);
    throw new Error("Failed to add chapter. Does this chapter number already exist?");
  }

  // 2. SPLIT TEXT INTO 1000-CHAR CHUNKS WITH 200-CHAR OVERLAP
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const textChunks = getOverlapChunks(content, 1000, 200);
  const chunkInserts = [];

  // 3. GENERATE VECTORS FOR EVERY SINGLE CHUNK
  for (let i = 0; i < textChunks.length; i++) {
    const chunkText = textChunks[i];
    
    // Generate the vector for just this 1000-character slice
    const embeddingResponse = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: chunkText, 
      config: { outputDimensionality: 768 }
    });
    
    // Prep it for the database
    chunkInserts.push({
      novel_id: novelId,
      chapter_id: newChapter.id, // Link this chunk back to the main chapter
      chunk_index: i,
      content: chunkText,
      embedding: embeddingResponse.embeddings[0].values, 
    });
  }

  // 4. BATCH INSERT ALL CHUNKS INTO THE NEW TABLE
  const { error: chunkError } = await supabase
    .from("chapter_chunks")
    .insert(chunkInserts);

  if (chunkError) {
    console.error("Chunking Database Error:", chunkError);
  }

  revalidatePath(`/novels/${novelId}`);
  revalidatePath(`/author`);
  redirect(`/novels/${novelId}`);
}