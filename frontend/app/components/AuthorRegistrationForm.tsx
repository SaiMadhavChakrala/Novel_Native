"use client";

import { useState } from "react";
import styles from "../styles/AuthorRegister.module.css";
import { useRouter } from "next/navigation";
import type { User } from "next-auth";

// Define the props for the component, expecting a user object
interface AuthorRegistrationFormProps {
  user: User;
}

export default function AuthorRegistrationForm({ user }: AuthorRegistrationFormProps) {
  const router = useRouter();

  // Pre-fill the pen name with the user's existing name
  const [penName, setPenName] = useState(user.name || "");
  const [bio, setBio] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      alert("You must agree to the terms and conditions.");
      return;
    }
    setIsSubmitting(true);

    // --- In a real application, you would update the user's profile in Supabase ---
    // For example, you might set a new role or add the pen name and bio to their record.
    // await supabase.from('profiles').update({ 
    //   pen_name: penName, 
    //   bio: bio,
    //   role: 'author'
    // }).eq('id', user.id);

    console.log("Submitting author application:");
    console.log({ userId: user.id, penName, bio });
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsSubmitting(false);
    alert("Congratulations! You are now a registered author.");
    router.push("/author"); // Redirect to the author dashboard
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formGroup}>
        <label htmlFor="penName">Author Pen Name</label>
        <input
          type="text"
          id="penName"
          value={penName}
          onChange={(e) => setPenName(e.target.value)}
          className={styles.input}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <label htmlFor="bio">Author Bio</label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className={styles.textarea}
          placeholder="Tell your readers a little about yourself..."
          rows={5}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <div className={styles.checkboxContainer}>
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className={styles.checkbox}
          />
          <label htmlFor="terms">
            I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms and Conditions</a>.
          </label>
        </div>
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={!agreedToTerms || isSubmitting}>
          {isSubmitting ? "Submitting..." : "Complete Registration"}
        </button>
      </div>
    </form>
  );
}