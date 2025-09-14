"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image"; // 👈 Import Image component
import styles from "../../../../styles/AddChapter.module.css";
import { useRouter } from "next/navigation";

export default function AddChapterPage() {
  const params = useParams();
  const novelId = params?.id as string;
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  // 👇 1. Add state for the background image
  const [backgroundImage, setBackgroundImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 👇 2. Add handler for image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // --- In a real application, you would add your Supabase logic here ---
    // 1. Upload the backgroundImage to Supabase Storage.
    // 2. Get the public URL of the uploaded image.
    // 3. Insert chapter data (title, content, and the image URL) into the 'chapters' table.

    console.log("Submitting to database:");
    console.log({
      novel_id: novelId,
      title: title,
      content: content,
      backgroundImage: backgroundImage, // The image file object
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsSubmitting(false);
    alert("Chapter submitted successfully! (Check console for data)");
    router.push(`/author`);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>✍️ Write a New Chapter</h1>
        <p className={styles.subtitle}>
          For Novel ID: {novelId}
        </p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* 👇 3. Use a grid for a better layout */}
        <div className={styles.formGrid}>
          <div className={styles.leftColumn}>
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
          </div>
          <div className={styles.rightColumn}>
             <div className={styles.formGroup}>
              <label>Background Image</label>
              <div className={styles.imageUploader}>
                <div className={styles.imagePreview}>
                  {imagePreview ? (
                    <Image src={imagePreview} alt="Background preview" layout="fill" objectFit="cover" />
                  ) : (
                    <span>+<br />Upload</span>
                  )}
                </div>
                <input
                  type="file"
                  id="bg-upload"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageChange}
                  className={styles.fileInput}
                />
                <label htmlFor="bg-upload" className={styles.uploadButton}>
                  Choose File
                </label>
              </div>
            </div>
          </div>
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