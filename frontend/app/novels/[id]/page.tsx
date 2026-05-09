import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import styles from "../../styles/NovelDetails.module.css";
import { notFound } from "next/navigation";
import NovelLoreChat from "../../components/NovelLoreChat";

export default async function NovelDetails({ params }: { params: Promise<{ id: string }> }) {
  // 1. Await the dynamic routing params
  const { id } = await params;

  // 2. Fetch the novel AND the associated author's pen name in one query
  const { data: novel, error: novelError } = await supabase
    .from("novels")
    .select(`*, authors(pen_name)`)
    .eq("id", id)
    .single();

  // If the novel doesn't exist, show a 404 page
  if (novelError || !novel) return notFound();

  // 3. Fetch all PUBLISHED chapters for this novel
  const { data: chapters } = await supabase
    .from("chapters")
    .select("chapter_number, title")
    .eq("novel_id", id)
    .eq("is_published", true)
    .order("chapter_number", { ascending: true });

  const authorName = novel.authors?.pen_name || "Unknown Author";
  const tags = novel.genre && novel.genre.length > 0 ? novel.genre : ["Uncategorized"];

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1>{novel.title}</h1>
        <p className={styles.meta}>
          By {authorName} • {novel.status}
        </p>
        <p className={styles.description}>{novel.description || "No description provided."}</p>

        {/* Display genres as Tags */}
        <div className={styles.tagContainer}>
          {tags.map((tag: string) => (
            <span key={tag} className={styles.tag}>
              {tag}
            </span>
          ))}
        </div>

        <div className={styles.actions}>
          {chapters && chapters.length > 0 ? (
            <>
              <Link href={`/novels/${id}/chapters/${chapters[0].chapter_number}`} className={styles.button}>
                ▶️ Start Reading
              </Link>
              <Link href={`/novels/${id}/chapters`} className={styles.buttonOutline}>
                📚 Browse Chapters
              </Link>
            </>
          ) : (
            <p style={{ color: "#888", marginTop: "1rem" }}>No chapters published yet.</p>
          )}
        </div>
      </div>

      <div className={styles.chapterList}>
        <h2>Chapters</h2>
        {chapters && chapters.length > 0 ? (
          <ul>
            {chapters.map((ch) => (
              <li key={ch.chapter_number}>
                <Link href={`/novels/${id}/chapters/${ch.chapter_number}`}>
                  Chapter {ch.chapter_number}: {ch.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>The author is still working on the first chapter!</p>
        )}
      </div>

      {chapters && chapters.length > 0 && (
        <NovelLoreChat novelId={id} />
      )}
    </div>
  );
}