import { auth } from "../../auth";
import Link from "next/link";
import styles from "../../styles/AuthorRegister.module.css";
import AuthorRegistrationForm from "../../components/AuthorRegistrationForm";

export default async function RegisterPage() {
  // Fetch the user's session on the server
  const session = await auth();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>✍️ Become an Author</h1>
        <p className={styles.subtitle}>
          Share your stories with a passionate community of readers.
        </p>
      </header>

      {/* Conditionally render content based on session status */}
      {session?.user ? (
        // If logged in, show the registration form
        <AuthorRegistrationForm user={session.user} />
      ) : (
        // If not logged in, show a prompt to sign in
        <div className={styles.signInPrompt}>
          <h2>Please Sign In to Continue</h2>
          <p>You need an account before you can register as an author.</p>
          <Link href="/profile" className={styles.button}>
            Sign In with Google
          </Link>
        </div>
      )}
    </div>
  );
}