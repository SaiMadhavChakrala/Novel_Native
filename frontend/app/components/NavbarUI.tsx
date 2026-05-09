"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../styles/Navbar.module.css";
import type { Session } from "next-auth";

interface NavbarUIProps {
  session: Session | null;
}

const site_name: string = "WebNovelHub";

export default function NavbarUI({ session }: NavbarUIProps) {
  // State to control the navbar's visibility
  const [isVisible, setIsVisible] = useState(true);

  return (
    <>
      {/* The main navbar */}
      <nav className={`${styles.navbar} ${!isVisible ? styles.hidden : ""}`}>
        <div className={styles.navContent}>
          <Link href="/" className={styles.logo}>
            {site_name}
          </Link>
          <div className={styles.navLinks}>
            <Link href="/novels" className={styles.navLink}>
              Novels
            </Link>
            {session?.user ? (
                <>
              <Link href="/profile" className={styles.navLink} title="Profile">{session.user.name!}
              </Link>
              <Link href="/author" className={styles.navLink}>
                  My Novels
                </Link>
                </>
            ) : (
              <Link href="/profile" className={styles.signInButton}>
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* The button to toggle the navbar's visibility */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={styles.toggleButton}
        title={isVisible ? "Hide Navbar" : "Show Navbar"}
        aria-label={isVisible ? "Hide navigation" : "Show navigation"}
      >
        <span aria-hidden="true">{isVisible ? "⌃" : "⌄"}</span>
      </button>
    </>
  );
}
