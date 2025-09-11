"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "../../../../styles/AddChapter.module.css";

export default function AddChapterPage() {
  const params = useParams();
  const novelId = params?.id as string;

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // This function will handle the form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // In a real application, you would add your Supabase logic here
    // to insert the new chapter into your 'chapters' table.
    console.log("Submitting to database:");
    console.log({
      novel_id: novelId,
      title: title,
      content: content,
      // You might also need to fetch and add the next chapter number
    });

    // Simulate network request
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    alert("Chapter submitted successfully! (Check console for data)");
    // Optionally, redirect the user back to the author dashboard
    // import { useRouter } from 'next/navigation';
    // const router = useRouter();
    // router.push('/author');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>✍️ Write a New Chapter</h1>
        <p className={styles.subtitle}>
          For Novel ID: {novelId} {/* You could fetch and show novel title here */}
        </p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label htmlFor="title" className={styles.label}>
            Chapter Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.input}
            placeholder="e.g., The Shadow's Advance"
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="content" className={styles.label}>
            Content
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={styles.textarea}
            placeholder="The wind howled as shadows danced across the forest floor..."
            rows={20}
            required
          />
        </div>

        <div className={styles.actions}>
          <Link href="/author" className={styles.buttonOutline}>
            Cancel
          </Link>
          <button
            type="submit"
            className={styles.button}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Publishing..." : "Publish Chapter"}
          </button>
        </div>
      </form>
    </div>
  );
}