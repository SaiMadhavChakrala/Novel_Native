import styles from './styles/Home.module.css';
import Link from 'next/link';
import { supabase } from './lib/content'

const site_name: string = "WebNovelHub";

export default function Home() {
  // getNovels()
  // someFunction()
  return (
    <div className={styles.container}>
      <header className={styles.hero}>
        {/* <Image src="/logo.svg" alt="Logo" width={80} height={80} /> */}
        <h1>Welcome to {site_name}</h1>
        <p>Your platform to read and write engaging web novels.</p>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <h2>📚 Browse Novels</h2>
          <p>Explore fantasy, romance, sci-fi, and more. New chapters every day!</p>
          <Link href="/novels" className={styles.button} >Start Reading</Link>
        </div>

        <div className={styles.card}>
          <h2>✍️ Become an Author</h2>
          <p>Got a story? Share it with the world and gain your own followers.</p>
          <a href="/author/register" className={styles.buttonOutline}>Join as Author</a>
        </div>
      </main>

      <footer className={styles.footer}>
        © {new Date().getFullYear()} {site_name}. All rights reserved.
      </footer>
    </div>
  );
}




async function getNovels() {
  const { data, error } = await supabase
    .from('Profiles')
    .select('*');
  
  if (error) console.error('Error fetching profile:', error);
  else console.log('Profile:', data);
}

async function someFunction() {
  const { data, error } = await supabase
    .from('Profiles')
    .insert({ 
     id : 1, 
     created_at: "09-22-2025",
     Name: "Aswin Arun",
     Display_name: "Amon"
    });

  if (error) {
    console.error('Error inserting data:', error);
    return;
  }

  console.log('Data inserted:', data);
}