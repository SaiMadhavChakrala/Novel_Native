"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../styles/Navbar.module.css";

interface NavbarUIProps {
  userName: string | null;
}

const site_name: string = "WebNovelHub";

export default function NavbarUI({ userName }: NavbarUIProps) {
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
            {userName ? (
                <>
              <Link href="/profile" className={styles.navLink} title="Profile">{userName}
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
