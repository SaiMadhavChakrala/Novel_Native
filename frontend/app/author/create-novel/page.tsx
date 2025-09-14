"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "../../styles/CreateNovel.module.css"
import { useRouter } from "next/navigation";

// A list of genres for the dropdown
const genres = ["Fantasy", "Sci-Fi", "Romance", "Adventure", "Mystery", "Horror", "Historical"];

export default function CreateNovelPage() {
  const router = useRouter();

  // State for all form fields
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState(genres[0]);
  const [synopsis, setSynopsis] = useState("");
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle image selection and create a preview URL
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      const previewUrl = URL.createObjectURL(file);
      setCoverImagePreview(previewUrl);
    }
  };

  // Handle the form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !synopsis || !coverImage) {
      alert("Please fill in all fields and select a cover image.");
      return;
    }
    setIsSubmitting(true);

    // --- In a real application, you would add your Supabase logic here ---
    // 1. Upload the cover image to Supabase Storage.
    //    const { data: imageData, error: imageError } = await supabase.storage
    //      .from('novel-covers')
    //      .upload(`${Date.now()}_${coverImage.name}`, coverImage);
    //
    // 2. If upload is successful, get the public URL.
    //    const coverImageUrl = supabase.storage
    //      .from('novel-covers')
    //      .getPublicUrl(imageData.path).data.publicUrl;
    //
    // 3. Insert the novel data (including the image URL) into your 'novels' table.
    //    const { data: novelData, error: novelError } = await supabase
    //      .from('novels')
    //      .insert([{ title, genre, synopsis, cover_image_url: coverImageUrl, author_id: session.user.id }]);

    console.log("Submitting new novel to database:");
    console.log({ title, genre, synopsis, coverImage });

    // Simulate network request
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    setIsSubmitting(false);
    alert("Novel created successfully! (Check console for data)");
    router.push("/author"); // Redirect back to the dashboard
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Create a New Novel</h1>
        <p className={styles.subtitle}>Fill in the details to bring your story to life.</p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGrid}>
          {/* Left Column: Text Inputs */}
          <div className={styles.leftColumn}>
            <div className={styles.formGroup}>
              <label htmlFor="title">Novel Title</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={styles.input}
                placeholder="The Last Dragon of Nebulae"
                required
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="genre">Genre</label>
              <select
                id="genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className={styles.select}
              >
                {genres.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="synopsis">Synopsis</label>
              <textarea
                id="synopsis"
                value={synopsis}
                onChange={(e) => setSynopsis(e.target.value)}
                className={styles.textarea}
                placeholder="In a world where stars are fading, a young hero..."
                rows={10}
                required
              />
            </div>
          </div>

          {/* Right Column: Image Uploader */}
          <div className={styles.rightColumn}>
            <div className={styles.formGroup}>
              <label>Cover Image</label>
              <div className={styles.imageUploader}>
                <div className={styles.imagePreview}>
                  {coverImagePreview ? (
                    <Image src={coverImagePreview} alt="Cover preview" layout="fill" objectFit="cover" />
                  ) : (
                    <span>+<br />Upload Cover</span>
                  )}
                </div>
                <input
                  type="file"
                  id="cover-upload"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageChange}
                  className={styles.fileInput}
                  required
                />
                <label htmlFor="cover-upload" className={styles.uploadButton}>
                  Choose File
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className={styles.actions}>
          <Link href="/author" className={styles.buttonOutline}>
            Cancel
          </Link>
          <button type="submit" className={styles.button} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Novel"}
          </button>
        </div>
      </form>
    </div>
  );
}