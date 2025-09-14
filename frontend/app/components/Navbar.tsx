import Link from "next/link";
import Image from "next/image";
import { auth } from "../auth"; // Adjust path if needed
import styles from "../styles/Navbar.module.css";

const site_name: string = "WebNovelHub";

export default async function Navbar() {
  // Fetch session on the server to dynamically show user info
  const session = await auth();

  return (
    <nav className={styles.navbar}>
      <div className={styles.navContent}>
        {/* Left Side: Logo/Site Name */}
        <Link href="/" className={styles.logo}>
          {site_name}
        </Link>

        {/* Right Side: Links and Profile */}
        <div className={styles.navLinks}>
          <Link href="/novels" className={styles.navLink}>
            Novels
          </Link>
          
          {/* This part changes based on login status */}
          {session?.user ? (
            <Link href="/profile" title="Profile">
                {session.user.name!}
            </Link>
          ) : (
            <Link href="/profile" className={styles.signInButton}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}