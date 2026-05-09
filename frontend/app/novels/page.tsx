import Link from 'next/link';
import styles from '../styles/Novels.module.css';
import { supabase } from '@/app/lib/supabase'; 

export const dynamic = "force-dynamic";

interface NovelListItem {
  id: string;
  title: string;
  description: string | null;
  genre: string[] | null;
  authors?: { pen_name: string | null } | null;
}

export default async function Novels() {
  // Fetch all novels, PLUS the author's pen name in a single query
  const { data: novels, error } = await supabase
    .from('novels')
    .select(`*, authors(pen_name)`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching novels:", error);
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📚 Novels</h1>
      <p className={styles.subtitle}>Browse through our collection of engaging stories</p>

      <div className={styles.grid}>
        {!novels || novels.length === 0 ? (
          <p>No novels available right now. Check back later!</p>
        ) : (
          (novels as NovelListItem[]).map((novel) => {
            const authorName = novel.authors?.pen_name || "Unknown Author";
            // Check if tags exist, otherwise default to Uncategorized
            const tags = novel.genre && novel.genre.length > 0 ? novel.genre : ["Uncategorized"];

            return (
              <div key={novel.id} className={styles.card}>
                <h2>{novel.title}</h2>
                <p className={styles.authorLabel}>By {authorName}</p>
                
                {/* Display Tags as Badges */}
                <div className={styles.tagContainer}>
                  {tags.map((tag: string) => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>

                <p className={styles.description}>{novel.description || 'No description available.'}</p>
                
                <Link href={`/novels/${novel.id}`} className={styles.button}>
                  Read Now →
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
