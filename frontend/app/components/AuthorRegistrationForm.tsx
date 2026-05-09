"use client";

import { useState, useEffect } from "react";
import styles from "../styles/AuthorRegister.module.css";
import type { User } from "next-auth";
import { registerAuthorAction } from "@/app/actions/authorActions";

// Define the props for the component, expecting a user object
interface AuthorRegistrationFormProps {
  user: User;
}

export default function AuthorRegistrationForm({ user }: AuthorRegistrationFormProps) {
  // Pre-fill the pen name with the user's existing name
  const [penName, setPenName] = useState(user.name || "");
  const [bio, setBio] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 5-second timer for any registration errors
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!agreedToTerms) {
      setErrorMsg("You must agree to the terms and conditions.");
      return;
    }
    
    setIsSubmitting(true);
    setErrorMsg(null);

    // Package our React state into FormData for the server action
    const formData = new FormData();
    formData.append("pen_name", penName);
    formData.append("bio", bio);

    try {
      // Call the server action which connects to Supabase
      const result = await registerAuthorAction(formData);
      
      if (result?.error) {
        setErrorMsg(result.error);
        setIsSubmitting(false);
      }
      // If successful, the server action automatically handles the redirect to /author!
    } catch {
      setErrorMsg("Failed to register. Please try again later.");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {/* ERROR BANNER */}
      {errorMsg && (
        <div style={{
          backgroundColor: '#ff4d4f', 
          color: 'white', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem', 
          textAlign: 'center',
          fontWeight: '600'
        }}>
          {errorMsg}
        </div>
      )}

      <div className={styles.formGroup}>
        <label htmlFor="penName">Author Pen Name</label>
        <input
          type="text"
          id="penName"
          name="pen_name"
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
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className={styles.textarea}
          placeholder="Tell your readers a little about yourself..."
          rows={5}
          required
        />
      </div>

      <div className={styles.formGroup}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
          <input
            type="checkbox"
            id="terms"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
          />
          <label htmlFor="terms" style={{ cursor: 'pointer' }}>
            I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#0070f3' }}>Terms and Conditions</a>.
          </label>
        </div>
      </div>

      <div className={styles.actions} style={{ marginTop: '2rem' }}>
        <button 
          type="submit" 
          className={styles.button} 
          disabled={!agreedToTerms || isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Complete Registration"}
        </button>
      </div>
    </form>
  );
}
