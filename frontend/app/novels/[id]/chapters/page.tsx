import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import styles from "../../../styles/BrowseChapters.module.css";
import { notFound } from "next/navigation";
import { auth } from "@/app/auth";
import { getAccessiblePublishedChapters } from "@/app/lib/userAccess";

export const dynamic = "force-dynamic";

export default async function BrowseChaptersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  // Fetch just the title to display in the header
  const { data: novel } = await supabase.from("novels").select("title").eq("id", id).single();
  
  if (!novel) return notFound();

  const {
    accessibleChapters: chapters,
    totalPublishedChapters,
    lockedChapterCount,
  } = await getAccessiblePublishedChapters(id, session);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>📚 {novel.title}</h1>
        <Link href={`/novels/${id}`} className={styles.backButton}>
          ← Back to Details
        </Link>
      </header>
      
      <p className={styles.subtitle}>
        Browse {chapters.length} of {totalPublishedChapters} available chapters
      </p>

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
            {lockedChapterCount > 0 && (
              <li className={styles.listItem}>
                <span className={styles.chapterNumber}>Locked</span>
                <span className={styles.chapterTitle}>
                  {lockedChapterCount} premium chapter{lockedChapterCount === 1 ? "" : "s"}
                </span>
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
