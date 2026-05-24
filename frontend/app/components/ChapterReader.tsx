"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../styles/Chapter.module.css";

interface ChapterReaderProps {
  novelId: string;
  chapterNumber: number;
  title: string;
  content: string;
  previousChapter: number | null;
  nextChapter: number | null;
}

export default function ChapterReader({
  novelId,
  chapterNumber,
  title,
  content,
  previousChapter,
  nextChapter,
}: ChapterReaderProps) {
  const [opacity, setOpacity] = useState(0.25);
  const [isPlainText, setIsPlainText] = useState(false);

  return (
    <div
      className={`${styles.container} ${isPlainText ? styles.plainTextContainer : ""}`}
      style={!isPlainText ? { backgroundImage: `url(/images/chained_iles.jpg)` } : {}}
    >
      {!isPlainText && <div className={styles.overlay}></div>}
      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <Link href={`/novels/${novelId}`} className={styles.backToNovelLink}>
            Back to Novel
          </Link>
          <h1>Chapter {chapterNumber}: {title}</h1>

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
          <p style={{ whiteSpace: "pre-wrap", lineHeight: "1.8" }}>{content}</p>
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
            {previousChapter && (
              <Link href={`/novels/${novelId}/chapters/${previousChapter}`} className={styles.buttonOutline}>
                Previous
              </Link>
            )}
            {nextChapter && (
              <Link href={`/novels/${novelId}/chapters/${nextChapter}`} className={styles.button}>
                Next
              </Link>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
