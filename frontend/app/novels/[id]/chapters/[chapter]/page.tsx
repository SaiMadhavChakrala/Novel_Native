"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";
import styles from "../../../../styles/Chapter.module.css";

interface ChapterData {
  title: string;
  content: string;
}

export default function ChapterPage() {
  const params = useParams();
  const id = params?.id as string;
  const chapterNumber = parseInt(params?.chapter as string);

  // States for DB Data
  const [chapterData, setChapterData] = useState<ChapterData | null>(null);
  const [totalChapters, setTotalChapters] = useState(0);
  const [loading, setLoading] = useState(true);

  // States for UI
  const [opacity, setOpacity] = useState(0.25);
  const [isPlainText, setIsPlainText] = useState(false);

  useEffect(() => {
    if (!id || !chapterNumber) return;

    async function fetchChapter() {
      setLoading(true);
      // Fetch the specific chapter
      const { data } = await supabase
        .from("chapters")
        .select("*")
        .eq("novel_id", id)
        .eq("chapter_number", chapterNumber)
        .single();

      // Count total published chapters to know if we should hide the "Next" button
      const { count } = await supabase
        .from("chapters")
        .select("*", { count: "exact", head: true })
        .eq("novel_id", id)
        .eq("is_published", true);

      setChapterData(data);
      setTotalChapters(count || 0);
      setLoading(false);
    }

    fetchChapter();
  }, [id, chapterNumber]);

  if (loading) return <div className={styles.container} style={{ textAlign: "center", padding: "5rem" }}>Loading Chapter...</div>;
  if (!chapterData) return <div className={styles.container} style={{ textAlign: "center", padding: "5rem" }}>Chapter not found.</div>;

  return (
    <div
      className={`${styles.container} ${isPlainText ? styles.plainTextContainer : ""}`}
      style={!isPlainText ? { backgroundImage: `url(/images/chained_iles.jpg)` } : {}}
    >
      {!isPlainText && <div className={styles.overlay}></div>}
      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <Link href={`/novels/${id}`} className={styles.backToNovelLink}>
            ← Back to Novel
          </Link>
          <h1>Chapter {chapterNumber}: {chapterData.title}</h1>
          
          <button 
            onClick={() => setIsPlainText(!isPlainText)}
            className={`${styles.toggleButton} ${isPlainText ? styles.active : ""}`}
          >
            {isPlainText ? "View Picture Mode" : "Read Only Text"}
          </button>
        </header>
        
        <article
          className={`${styles.content} ${isPlainText ? styles.plainTextContent : ""}`}
          style={!isPlainText ? { backgroundColor: `rgba(10, 10, 10, ${opacity})` } : {}}
        >
          {/* CRITICAL FIX: whiteSpace 'pre-wrap' forces HTML to respect database line breaks! */}
          <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.8" }}>{chapterData.content}</p>
        </article>
        
        <footer className={styles.footer}>
          {!isPlainText && (
            <div className={styles.settingsControl}>
              <span>Background Opacity</span>
              <input
                type="range"
                min="0"
                max="0.9"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
              />
            </div>
          )}

          <div className={styles.navButtons}>
            {chapterNumber > 1 && (
              <Link href={`/novels/${id}/chapters/${chapterNumber - 1}`} className={styles.buttonOutline}>
                ← Previous
              </Link>
            )}
            {chapterNumber < totalChapters && (
              <Link href={`/novels/${id}/chapters/${chapterNumber + 1}`} className={styles.button}>
                Next →
              </Link>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
