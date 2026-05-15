import { auth } from "@/app/auth";
import { updateDraftChapterAction } from "@/app/actions/authorActions";
import { getSessionAuthorIds, syncAuthorIdentity } from "@/app/lib/authorIdentity";
import { supabase } from "@/app/lib/supabase";
import styles from "@/app/styles/AddChapter.module.css";
import { notFound, redirect } from "next/navigation";

const MAX_CHAPTER_CONTENT_LENGTH = 8000;

interface DraftChapter {
  id: string;
  chapter_number: number;
  title: string;
  content: string;
  is_published: boolean;
}

export const dynamic = "force-dynamic";

export default async function EditDraftChapterPage({
  params,
}: {
  params: Promise<{ id: string; chapterId: string }>;
}) {
  const { id, chapterId } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/profile");
  }

  await syncAuthorIdentity(session);
  const authorIds = getSessionAuthorIds(session);

  const { data: novel, error: novelError } = await supabase
    .from("novels")
    .select("id, title, author_id")
    .eq("id", id)
    .single();

  if (novelError || !novel) {
    notFound();
  }

  if (!authorIds.includes(novel.author_id)) {
    redirect("/author");
  }

  const { data: draft, error: draftError } = await supabase
    .from("chapters")
    .select("id, chapter_number, title, content, is_published")
    .eq("id", chapterId)
    .eq("novel_id", id)
    .eq("is_published", false)
    .single();

  if (draftError || !draft) {
    notFound();
  }

  const draftChapter = draft as DraftChapter;
  const submitDraft = updateDraftChapterAction.bind(null, id, chapterId);

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Edit Draft</h1>
        <p className={styles.subtitle}>{novel.title}</p>
      </div>

      <form action={submitDraft} className={styles.form}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Chapter Number</label>
          <input
            className={styles.input}
            type="number"
            name="chapterNumber"
            min="1"
            step="1"
            defaultValue={draftChapter.chapter_number}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Chapter Title</label>
          <input
            className={styles.input}
            type="text"
            name="title"
            defaultValue={draftChapter.title}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Content</label>
          <textarea
            className={styles.textarea}
            name="content"
            rows={15}
            maxLength={MAX_CHAPTER_CONTENT_LENGTH}
            defaultValue={draftChapter.content}
            required
          />
        </div>

        <div className={styles.actions}>
          <button className={styles.buttonOutline} type="submit" name="intent" value="draft">
            Save Draft
          </button>
          <button className={styles.button} type="submit" name="intent" value="publish">
            Publish Chapter
          </button>
        </div>
      </form>
    </main>
  );
}
