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
 * 3. ADD CHAPTER LOGIC (With Vector Generation)
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

  // GENERATE THE VECTOR EMBEDDING
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const embeddingResponse = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: content.substring(0, 8000), 
    // 👇 ADD THIS CONFIG BLOCK 👇
    config: {
      outputDimensionality: 768, 
    }
  });
  
  const embedding = embeddingResponse?.embeddings[0]?.values;

  // SAVE TO DATABASE
  const { error: insertError } = await supabase
    .from("chapters")
    .insert({
      novel_id: novelId,
      title,
      content,
      chapter_number: chapterNumber,
      is_published: isPublished,
      embedding: embedding, // Save the generated vector!
    });

  if (insertError) {
    console.error("Database Error:", insertError);
    throw new Error("Failed to add chapter. Does this chapter number already exist?");
  }

  revalidatePath(`/novels/${novelId}`);
  revalidatePath(`/author`);
  redirect(`/novels/${novelId}`);
}