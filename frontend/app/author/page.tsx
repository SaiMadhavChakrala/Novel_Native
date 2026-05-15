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

interface DraftChapter {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  updated_at: string;
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

  const novelIds = ((authorNovels || []) as AuthorNovel[]).map((novel) => novel.id);
  const { data: draftChapters, error: draftError } = novelIds.length > 0
    ? await supabase
        .from("chapters")
        .select("id, novel_id, chapter_number, title, updated_at")
        .in("novel_id", novelIds)
        .eq("is_published", false)
        .order("updated_at", { ascending: false })
    : { data: [], error: null };

  if (draftError) {
    console.error("Error fetching draft chapters:", draftError);
  }

  const draftsByNovel = ((draftChapters || []) as DraftChapter[]).reduce<Record<string, DraftChapter[]>>((drafts, chapter) => {
    drafts[chapter.novel_id] = drafts[chapter.novel_id] || [];
    drafts[chapter.novel_id].push(chapter);
    return drafts;
  }, {});

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
            const novelDrafts = draftsByNovel[novel.id] || [];

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

                {novelDrafts.length > 0 && (
                  <div className={styles.drafts}>
                    <div className={styles.draftsHeader}>
                      <h4>Drafts</h4>
                      <span>{novelDrafts.length}</span>
                    </div>

                    <div className={styles.draftsList}>
                      {novelDrafts.map((draft) => (
                        <div key={draft.id} className={styles.draftItem}>
                          <div>
                            <p className={styles.draftTitle}>
                              Chapter {draft.chapter_number}: {draft.title}
                            </p>
                            <p className={styles.draftMeta}>
                              Updated {new Intl.DateTimeFormat("en", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }).format(new Date(draft.updated_at))}
                            </p>
                          </div>
                          <Link
                            href={`/author/novels/${novel.id}/chapters/${draft.id}/edit`}
                            className={styles.smallButton}
                          >
                            Continue Editing
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
