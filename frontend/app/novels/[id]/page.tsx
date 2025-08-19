"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import styles from "../../styles/NovelDetails.module.css";

export default function NovelDetails() {
  const params = useParams();
  const id = params?.id as string;

  // Mock data
  const novel = {
    id,
    title: "Shadow Realm",
    author: "Aether Quill",
    genre: "Fantasy",
    description:
      "A boy discovers a hidden world beyond reality and embarks on an epic adventure filled with magic, secrets, and betrayal.",
    chapters: Array.from({ length: 10 }, (_, i) => ({
      number: i + 1,
      title: `Chapter ${i + 1}: A New Beginning`,
    })),
  };

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1>{novel.title}</h1>
        <p className={styles.meta}>
          By {novel.author} • {novel.genre}
        </p>
        <p className={styles.description}>{novel.description}</p>

        <div className={styles.actions}>
          <Link href={`/novels/${id}/chapters/1`} className={styles.button}>
            ▶️ Start Reading
          </Link>
          <Link href={`/novels/${id}/chapters/3`} className={styles.buttonOutline}>
            📌 Continue (Chapter 3)
          </Link>
        </div>
      </div>

      <div className={styles.chapterList}>
        <h2>Chapters</h2>
        <ul>
          {novel.chapters.map((ch) => (
            <li key={ch.number}>
              <Link href={`/novels/${id}/chapters/${ch.number}`}>
                {ch.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
