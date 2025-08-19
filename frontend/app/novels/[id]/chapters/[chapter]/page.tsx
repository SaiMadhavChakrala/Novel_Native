"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "../../../../styles/Chapter.module.css";

export default function ChapterPage() {
  const params = useParams();
  const id = params?.id as string;
  const chapter = params?.chapter as string;

  const totalChapters = 10;
  const chapterContent = `
    The wind howled as shadows danced across the forest floor. 
    Elara gripped her lantern tightly, its dim glow the only 
    barrier between her and the encroaching darkness...
    
    She knew this was only the beginning.
  `;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Chapter {chapter}: A New Beginning</h1>
      </header>

      <article className={styles.content}>
        <p>{chapterContent}</p>
      </article>

      <footer className={styles.footer}>
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
  );
}
