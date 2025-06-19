import Image from 'next/image';
import styles from './styles/Home.module.css';

export default function Home() {
  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        {/* <Image src="/logo.svg" alt="Logo" width={80} height={80} /> */}
        <h1>Welcome to WebNovelHub</h1>
        <p>Your platform to read and write engaging web novels.</p>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h2>📚 Browse Novels</h2>
          <p>Explore fantasy, romance, sci-fi, and more. New chapters every day!</p>
          <a href="/novels" className={styles.button}>Start Reading</a>
        </div>

        <div className={styles.card}>
          <h2>✍️ Become an Author</h2>
          <p>Got a story? Share it with the world and gain your own followers.</p>
          <a href="/author/register" className={styles.buttonOutline}>Join as Author</a>
        </div>
      </main>

      <footer className={styles.footer}>
        © {new Date().getFullYear()} WebNovelHub. All rights reserved.
      </footer>
    </div>
  );
}
