import Link from "next/link";
import { signIn, signOut, auth } from "../auth";

export default async function ProfilePage() {
  // Get session details
  const session = await auth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      {/* Back button */}
      <div className="absolute top-5 left-5">
        <Link
          href="/"
          className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 transition"
        >
          ← Back
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">Profile</h1>

      {/* If user is signed in, show their info */}
      {session?.user ? (
        <div className="text-center space-y-4">
          {session.user.image && (
            <img
              src={session.user.image}
              alt="User avatar"
              className="w-20 h-20 rounded-full mx-auto border-2 border-gray-500"
            />
          )}
          <p className="text-xl">Welcome, {session.user.name}!</p>
          <p className="text-gray-400">{session.user.email}</p>

          {/* Sign Out Button */}
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition"
            >
              Sign Out
            </button>
          </form>
        </div>
      ) : (
        // If not signed in, show sign in button
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition"
          >
            Sign In with Google
          </button>
        </form>
      )}
    </div>
  );
}
