import type { Session } from "next-auth";
import { supabase } from "@/app/lib/supabase";

interface AuthorRow {
  id: string;
  pen_name: string;
  bio: string | null;
  avatar_url: string | null;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}

export function getSessionAuthorIds(session: Session | null) {
  const canonicalId = session?.user?.id;
  const legacyIds = session?.user?.legacyUserIds ?? [];

  return uniqueStrings([canonicalId, ...legacyIds]);
}

export async function syncAuthorIdentity(session: Session | null) {
  const canonicalId = session?.user?.id;
  const ids = getSessionAuthorIds(session);
  const legacyIds = ids.filter((id) => id !== canonicalId);

  if (!canonicalId) {
    return null;
  }

  const { data: canonicalAuthor } = await supabase
    .from("authors")
    .select("id")
    .eq("id", canonicalId)
    .maybeSingle();

  if (!canonicalAuthor && legacyIds.length > 0) {
    const { data: legacyAuthors } = await supabase
      .from("authors")
      .select("id, pen_name, bio, avatar_url")
      .in("id", legacyIds)
      .limit(1);

    const legacyAuthor = (legacyAuthors?.[0] ?? null) as AuthorRow | null;

    if (legacyAuthor) {
      await supabase.from("authors").insert({
        id: canonicalId,
        pen_name: legacyAuthor.pen_name,
        bio: legacyAuthor.bio,
        avatar_url: legacyAuthor.avatar_url,
      });
    }
  }

  if (legacyIds.length > 0) {
    await supabase
      .from("novels")
      .update({ author_id: canonicalId })
      .in("author_id", legacyIds);
  }

  const { data: author } = await supabase
    .from("authors")
    .select("id")
    .eq("id", canonicalId)
    .maybeSingle();

  return author;
}
