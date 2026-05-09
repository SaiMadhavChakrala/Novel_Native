import { addChapterAction } from "@/app/actions/authorActions";
import styles from "@/app/styles/AddChapter.module.css";

// FIX: In Next.js 15, params is a Promise that must be awaited
export default async function AddChapterPage({ params }: { params: Promise<{ id: string }> }) {
  // Await the params before extracting the ID
  const { id } = await params;
  
  // Bind the securely extracted ID to the action
  const submitChapter = addChapterAction.bind(null, id);

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Add a Chapter</h1>
        <p className={styles.subtitle}>Continue your story</p>
      </div>

      <form action={submitChapter} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Chapter Number</label>
          <input className={styles.input} type="number" name="chapterNumber" placeholder="e.g. 1" required />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Chapter Title</label>
          <input className={styles.input} type="text" name="title" placeholder="The Beginning" required />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Content</label>
          <textarea className={styles.textarea} name="content" placeholder="Write your story here..." rows={15} required />
        </div>
        
        <div className={styles.formGroup} style={{ marginTop: '1rem' }}>
          <label className={styles.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="isPublished" value="true" style={{ width: '1.2rem', height: '1.2rem' }} />
            Publish immediately? (Leave unchecked to save as Draft)
          </label>
        </div>
        
        <div className={styles.actions}>
          <button className={styles.button} type="submit">Save Chapter</button>
        </div>
      </form>
    </main>
  );
}