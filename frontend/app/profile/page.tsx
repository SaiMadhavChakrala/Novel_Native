import { signIn, signOut, auth } from "../auth";
import Link from "next/link";
import { supabase } from "@/app/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  let isAuthor = false;

  // If logged in, check if they are in the 'authors' database
  if (session?.user?.id) {
    const { data } = await supabase
      .from("authors")
      .select("id")
      .eq("id", session.user.id)
      .single();
      
    if (data) isAuthor = true;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#121212] text-white p-6">
      <div className="max-w-md w-full bg-[#1e1e1e] border border-[#333] rounded-xl p-8 shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>

        {session?.user ? (
          <div className="space-y-6">
            {session.user.image && (
              <img
                src={session.user.image}
                alt="User avatar"
                className="w-24 h-24 rounded-full mx-auto border-4 border-blue-500 shadow-md"
              />
            )}
            <div>
              <p className="text-2xl font-semibold">Welcome, {session.user.name}!</p>
              <p className="text-gray-400 mt-1">{session.user.email}</p>
            </div>

            <div className="pt-4 border-t border-[#333] space-y-4">
              {isAuthor ? (
                <Link href="/author" className="block w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition text-center">
                  Go to Author Dashboard
                </Link>
              ) : (
                <Link href="/author/register" className="block w-full py-3 bg-transparent border-2 border-blue-600 text-blue-500 hover:bg-blue-600 hover:text-white font-semibold rounded-lg transition text-center">
                  Become an Author
                </Link>
              )}

              <form action={async () => { "use server"; await signOut(); }}>
                <button type="submit" className="w-full py-3 bg-[#333] hover:bg-red-600 text-white font-semibold rounded-lg transition">
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-400 mb-6">Sign in to read, bookmark, and publish your own novels.</p>
            <form action={async () => { "use server"; await signIn("google"); }}>
              <button type="submit" className="w-full py-3 bg-white text-black hover:bg-gray-200 font-bold rounded-lg transition flex items-center justify-center gap-2">
                Sign In with Google
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
