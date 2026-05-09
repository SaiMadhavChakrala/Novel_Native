"use client";

import { useState, useEffect } from "react";
import { createNovelAction } from "@/app/actions/authorActions";
import styles from "@/app/styles/CreateNovel.module.css";

// 25+ Preset Tags for easy clicking
const PRESET_TAGS = [
  "Action", "Adventure", "Comedy", "Cultivation", "Cyberpunk", 
  "Drama", "Dystopian", "Fantasy", "Harem", "Historical", 
  "Horror", "Isekai", "LitRPG", "Magic", "Martial Arts", 
  "Mecha", "Mystery", "Post-Apocalyptic", "Psychological", "Reincarnation", 
  "Romance", "Sci-Fi", "Slice of Life", "Steampunk", "Supernatural", 
  "System", "Thriller", "Tragedy", "Urban Fantasy"
];

export default function CreateNovelPage() {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");

  // 5-second timer for the error message
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Toggle a tag on and off
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Add a custom tag from the input
  const handleAddCustomTag = (e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    const trimmed = customTag.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
    }
    setCustomTag(""); // Clear input after adding
  };

  async function handleSubmit(formData: FormData) {
    setErrorMsg(null);
    try {
      const result = await createNovelAction(formData);
      if (result?.error) {
        setErrorMsg(result.error);
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred. Please try again.");
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Create a New Novel</h1>
        <p className={styles.subtitle}>Start your new journey</p>
      </div>

      {errorMsg && (
        <div style={{
          backgroundColor: '#ff4d4f', color: 'white', padding: '1rem', 
          borderRadius: '8px', marginBottom: '2rem', textAlign: 'center', 
          fontWeight: '600', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          {errorMsg}
        </div>
      )}

      <form action={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <label>Novel Title</label>
          <input className={styles.input} type="text" name="title" placeholder="e.g. The Royal Slayer" required />
        </div>
        
        <br />

        <div className={styles.formGroup}>
          <label>Synopsis</label>
          <textarea className={styles.textarea} name="description" placeholder="What is your story about?" rows={5} required />
        </div>

        <br />

        {/* --- TAG SELECTOR UI --- */}
        <div className={styles.formGroup}>
          <label>Genres / Tags</label>
          
          {/* 1. Hidden input stores the final array as a comma-separated string for the Server Action */}
          <input type="hidden" name="genres" value={selectedTags.join(',')} />

          {/* 2. Display the actively chosen tags */}
          <div className={styles.selectedTagsContainer}>
            {selectedTags.length === 0 && <span style={{ color: "#777", fontSize: "0.9rem", fontStyle: "italic" }}>No tags selected yet...</span>}
            {selectedTags.map((tag) => (
              <span key={tag} className={styles.tagPillActive} onClick={() => toggleTag(tag)} title="Click to remove">
                {tag} <span style={{ marginLeft: "6px", fontSize: "10px" }}>✕</span>
              </span>
            ))}
          </div>

          {/* 3. Custom tag input field */}
          <div className={styles.customTagInputWrapper}>
            <input 
              className={styles.input} 
              type="text" 
              placeholder="Type a custom tag and press Add..." 
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // Prevent the main form from submitting!
                  handleAddCustomTag();
                }
              }}
            />
            <button type="button" onClick={handleAddCustomTag} className={styles.buttonOutline}>
              Add Tag
            </button>
          </div>

          {/* 4. Display preset tags that haven't been selected yet */}
          <label style={{ fontSize: '0.9rem', color: '#a0a0a0', marginTop: '1rem' }}>Suggested Tags:</label>
          <div className={styles.tagsList}>
            {PRESET_TAGS.filter(tag => !selectedTags.includes(tag)).map((tag) => (
              <span key={tag} className={styles.tagPill} onClick={() => toggleTag(tag)}>
                + {tag}
              </span>
            ))}
          </div>
        </div>
        {/* --- END TAG SELECTOR UI --- */}

        <br />

        <div className={styles.formGroup}>
          <label>Status</label>
          <select className={styles.select} name="status">
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        <div className={styles.actions}>
          <button className={styles.button} type="submit">Create Novel</button>
        </div>
      </form>
    </main>
  );
}