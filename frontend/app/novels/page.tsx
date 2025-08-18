import Link from 'next/link';
import styles from '../styles/Novels.module.css';

interface Novel {
  id: number;
  title: string;
  genre: string;
  desc: string;
}

export default function Novels() {
  const novels: Novel[] = [
    { id: 1, title: 'Shadow Realm', genre: 'Fantasy', desc: 'A boy discovers a hidden world beyond reality.' },
    { id: 2, title: 'AI Love Story', genre: 'Romance', desc: 'An unlikely love between a human and an AI.' },
    { id: 3, title: 'Starlight Odyssey', genre: 'Sci-Fi', desc: 'Traveling across galaxies in search of home.' },
    { id: 4, title: 'Chronicles of Dawn', genre: 'Adventure', desc: 'Heroes rise against the tides of fate.' },
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📚 Novels</h1>
      <p className={styles.subtitle}>Browse through our collection of engaging stories</p>

      <div className={styles.grid}>
        {novels.map((novel) => (
          <div key={novel.id} className={styles.card}>
            <h2>{novel.title}</h2>
            <p><strong>Genre:</strong> {novel.genre}</p>
            <p>{novel.desc}</p>
            <Link href={`/novels/${novel.id}`} className={styles.button}>
              Read Now →
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
