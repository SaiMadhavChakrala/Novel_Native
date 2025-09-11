import Link from "next/link";
import { auth } from "../auth"; // Assuming auth.ts is in the root
import { redirect } from "next/navigation";
import styles from "../styles/Author.module.css";

// Mock data for the novels written by the logged-in author.
// In a real application, you would fetch this from your database.
const authorNovels = [
  {
    id: 1,
    title: "Shadow Realm",
    genre: "Fantasy",
    chapters: Array.from({ length: 10 }),
    status: "Ongoing",
  },
  {
    id: 4,
    title: "Chronicles of Dawn",
    genre: "Adventure",
    chapters: Array.from({ length: 25 }),
    status: "Completed",
  },
];

export default async function AuthorDashboard() {
  // Fetch the user's session
  const session = await auth();

  // If no user is logged in, redirect them to the profile page to sign in.
  if (!session?.user) {
    redirect("/profile");
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>✍️ Author Dashboard</h1>
        <p className={styles.subtitle}>
          Welcome back, {session.user.name}! Manage your stories here.
        </p>
      </header>

      <div className={styles.actionsHeader}>
        <h2>My Novels</h2>
        <Link href="/author/create-novel" className={styles.button}>
          + Create New Novel
        </Link>
      </div>

      <div className={styles.novelsGrid}>
        {authorNovels.map((novel) => (
          <div key={novel.id} className={styles.card}>
            <h3>{novel.title}</h3>
            <p className={styles.meta}>
              {novel.genre} •{" "}
              <span
                className={
                  novel.status === "Ongoing"
                    ? styles.statusOngoing
                    : styles.statusCompleted
                }
              >
                {novel.status}
              </span>
            </p>
            <p>
              <strong>Published Chapters:</strong> {novel.chapters.length}
            </p>

            <div className={styles.actions}>
              {/* This link would go to a page for adding a new chapter */}
              <Link
                href={`/author/novels/${novel.id}/add-chapter`}
                className={styles.button}
              >
                Add Chapter
              </Link>
              <Link
                href={`/novels/${novel.id}`}
                className={styles.buttonOutline}
              >
                View Novel
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}