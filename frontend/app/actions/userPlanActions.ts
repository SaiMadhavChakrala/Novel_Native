"use server";

import { auth } from "@/app/auth";
import { getSupabaseAdmin } from "@/app/lib/supabaseAdmin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function makeCurrentUserPremiumAction() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/profile");
  }

  const { error } = await getSupabaseAdmin()
    .from("user_profiles")
    .upsert(
      {
        id: session.user.id,
        email: session.user.email ?? null,
        display_name: session.user.name ?? null,
        plan: "premium",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    throw new Error(`Failed to upgrade user plan: ${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/profile");
  redirect("/");
}
