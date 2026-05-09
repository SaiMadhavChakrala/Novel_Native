import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import styles from "../../../styles/BrowseChapters.module.css";
import { notFound } from "next/navigation";

export default async function BrowseChaptersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch just the title to display in the header
  const { data: novel } = await supabase.from("novels").select("title").eq("id", id).single();
  
  if (!novel) return notFound();

  // Fetch chapters
  const { data: chapters } = await supabase
    .from("chapters")
    .select("chapter_number, title")
    .eq("novel_id", id)
    .eq("is_published", true)
    .order("chapter_number", { ascending: true });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>📚 {novel.title}</h1>
        <Link href={`/novels/${id}`} className={styles.backButton}>
          ← Back to Details
        </Link>
      </header>
      
      <p className={styles.subtitle}>Browse all available chapters</p>

      <div className={styles.listContainer}>
        {!chapters || chapters.length === 0 ? (
          <p>No chapters available yet.</p>
        ) : (
          <ul>
            {chapters.map((ch) => (
              <li key={ch.chapter_number} className={styles.listItem}>
                <Link href={`/novels/${id}/chapters/${ch.chapter_number}`}>
                  <span className={styles.chapterNumber}>Ch. {ch.chapter_number}</span>
                  <span className={styles.chapterTitle}>{ch.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}