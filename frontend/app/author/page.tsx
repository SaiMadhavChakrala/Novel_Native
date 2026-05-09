import Link from "next/link";
import { auth } from "../auth";
import { redirect } from "next/navigation";
import styles from "../styles/Author.module.css";
import { supabase } from "@/app/lib/supabase";
import { getSessionAuthorIds, syncAuthorIdentity } from "@/app/lib/authorIdentity";

export const dynamic = "force-dynamic";

interface AuthorNovel {
  id: string;
  title: string;
  genre: string[] | null;
  status: string | null;
  chapters?: { count: number }[];
}

export default async function AuthorDashboard() {
  // Fetch the user's session
  const session = await auth();

  // If no user is logged in, redirect them to the profile page to sign in.
  if (!session?.user?.id) {
    redirect("/profile");
  }

  await syncAuthorIdentity(session);
  const authorIds = getSessionAuthorIds(session);

  // Fetch novels by THIS author only, and include a count of their chapters
  const { data: authorNovels, error } = await supabase
    .from('novels')
    .select('*, chapters(count)')
    .in('author_id', authorIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching author novels:", error);
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
        {!authorNovels || authorNovels.length === 0 ? (
          <p>You have not created any novels yet. Start your writing journey today!</p>
        ) : (
          (authorNovels as AuthorNovel[]).map((novel) => {
            // Supabase returns related counts in an array like: [{ count: 5 }]
            const chapterCount = novel.chapters?.[0]?.count || 0;

            return (
              <div key={novel.id} className={styles.card}>
                <h3>{novel.title}</h3>
                <p className={styles.meta}>
                  {novel.genre && novel.genre.length > 0 ? novel.genre.join(', ') : 'Uncategorized'} •{" "}
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
                  <strong>Total Chapters:</strong> {chapterCount}
                </p>

                <div className={styles.actions}>
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
            );
          })
        )}
      </div>
    </div>
  );
}
