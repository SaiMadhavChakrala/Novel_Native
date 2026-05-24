import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/app/auth";
import ChapterReader from "@/app/components/ChapterReader";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import { getAccessiblePublishedChapters } from "@/app/lib/userAccess";
import styles from "../../../../styles/Chapter.module.css";

export const dynamic = "force-dynamic";

interface ChapterPageProps {
  params: Promise<{
    id: string;
    chapter: string;
  }>;
}

export default async function ChapterPage({ params }: ChapterPageProps) {
  const { id, chapter } = await params;
  const chapterNumber = Number.parseInt(chapter, 10);

  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
    return notFound();
  }

  const session = await auth();
  const {
    publishedChapters,
    accessibleChapters,
    totalPublishedChapters,
    visibleChapterCount,
  } = await getAccessiblePublishedChapters(id, session);

  const publishedChapterNumbers = publishedChapters.map((item) => item.chapter_number);
  const accessibleChapterNumbers = accessibleChapters.map((item) => item.chapter_number);

  if (!publishedChapterNumbers.includes(chapterNumber)) {
    return notFound();
  }

  if (!accessibleChapterNumbers.includes(chapterNumber)) {
    return (
      <div className={`${styles.container} ${styles.plainTextContainer}`}>
        <div className={styles.contentWrapper}>
          <header className={styles.header}>
            <Link href={`/novels/${id}`} className={styles.backToNovelLink}>
              Back to Novel
            </Link>
            <h1>Premium Chapter</h1>
          </header>
          <article className={styles.plainTextContent}>
            <p>
              This chapter is outside your current plan. Normal readers can access the first{" "}
              {visibleChapterCount} of {totalPublishedChapters} published chapters.
            </p>
          </article>
        </div>
      </div>
    );
  }

  const currentIndex = accessibleChapterNumbers.indexOf(chapterNumber);
  const previousChapter = currentIndex > 0 ? accessibleChapterNumbers[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && currentIndex < accessibleChapterNumbers.length - 1
    ? accessibleChapterNumbers[currentIndex + 1]
    : null;

  const { data: chapterData, error } = await getSupabaseAdmin()
    .from("chapters")
    .select("title, content")
    .eq("novel_id", id)
    .eq("chapter_number", chapterNumber)
    .eq("is_published", true)
    .single();

  if (error || !chapterData) {
    return notFound();
  }

  return (
    <ChapterReader
      novelId={id}
      chapterNumber={chapterNumber}
      title={chapterData.title}
      content={chapterData.content}
      previousChapter={previousChapter}
      nextChapter={nextChapter}
    />
  );
}
