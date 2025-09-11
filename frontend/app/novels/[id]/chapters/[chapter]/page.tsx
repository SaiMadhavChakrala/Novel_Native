"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "../../../../styles/Chapter.module.css";

export default function ChapterPage() {
  const params = useParams();
  const id = params?.id as string;
  const chapter = params?.chapter as string;

  // --- MOCK DATA ---
  const chapterData = {
    title: "A New Beginning",
    content: `
      The wind howled as shadows danced across the forest floor. 
      Elara gripped her lantern tightly, its dim glow the only 
      barrier between her and the encroaching darkness...
      
      She knew this was only the beginning.
      The wind howled as shadows danced across the forest floor. 
      Elara gripped her lantern tightly, its dim glow the only 
      barrier between her and the encroaching darkness...
      
      She knew this was only the beginning.
    `,
    backgroundImageUrl: "/images/chained_iles.jpg",
  };
  const totalChapters = 10;
  // --- END MOCK DATA ---

  const [opacity, setOpacity] = useState(0.25);
  // 👇 1. Add state to manage the plain text mode
  const [isPlainText, setIsPlainText] = useState(false);

  return (
    <div
      className={`${styles.container} ${
        isPlainText ? styles.plainTextContainer : ""
      }`}
      // 👇 2. Conditionally apply the background image
      style={
        !isPlainText
          ? { backgroundImage: `url(${chapterData.backgroundImageUrl})` }
          : {}
      }
    >
      {!isPlainText && <div className={styles.overlay}></div>}
      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <h1>Chapter {chapter}: {chapterData.title}</h1>
          {/* 👇 3. Add the toggle button */}
          <button
            onClick={() => setIsPlainText(!isPlainText)}
            className={styles.toggleButton}
            title="Toggle Plain Text Mode"
          >
            {isPlainText ? "🖼️" : "📖"}
          </button>
        </header>
        
        <article
          className={`${styles.content} ${
            isPlainText ? styles.plainTextContent : ""
          }`}
          style={
            !isPlainText
              ? { backgroundColor: `rgba(10, 10, 10, ${opacity})` }
              : {}
          }
        >
          <p>{chapterData.content}</p>
        </article>
        
        <footer className={styles.footer}>
          {/* 👇 4. Conditionally render the slider */}
          {!isPlainText && (
            <div className={styles.settingsControl}>
              <span>Opacity</span>
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
            {Number(chapter) > 1 && (
              <Link
                href={`/novels/${id}/chapters/${Number(chapter) - 1}`}
                className={styles.buttonOutline}
              >
                ← Previous
              </Link>
            )}
            {Number(chapter) < totalChapters && (
              <Link
                href={`/novels/${id}/chapters/${Number(chapter) + 1}`}
                className={styles.button}
              >
                Next →
              </Link>
            )}
          </div>
          <div className={styles.bookmark}>
            📌 <button className={styles.buttonSmall}>Bookmark This Chapter</button>
          </div>
        </footer>
      </div>
    </div>
  );
}