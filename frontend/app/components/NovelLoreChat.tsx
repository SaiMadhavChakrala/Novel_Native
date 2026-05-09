"use client";

import React, { useState } from "react";
import styles from "../styles/NovelLoreChat.module.css";

// Define the citation structure based on our enterprise API schema
interface Citation {
  quote: string;
  chapter_title: string;
}

export default function NovelLoreChat({ novelId }: { novelId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(false);

  const askQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    setLoading(true);
    setAnswer("");
    setCitations([]);

    try {
      const res = await fetch("/api/ask-novel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, novelId }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        setAnswer(data.error);
      } else {
        setAnswer(data.answer);
        if (data.citations) {
          setCitations(data.citations);
        }
      }
    } catch (err) {
      setAnswer("Sorry, the lore-master is currently asleep. Please try again later.");
    }
    setLoading(false);
  };

  return (
    <div className={styles.chatBox}>
      <h3 className={styles.title}>🧠 Ask the Lore-Master</h3>
      <p className={styles.intro}>
        Forget a character&apos;s name or a piece of lore? Ask the AI to search the published chapters!
      </p>
      
      <form onSubmit={askQuestion} className={styles.form}>
        <input 
          type="text" 
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What is the name of the artifact in the goblin cave?" 
          className={styles.input}
        />
        <button 
          type="submit" 
          disabled={loading || !question.trim()} 
          className={styles.button}
        >
          {loading ? "Searching..." : "Ask"}
        </button>
      </form>

      {answer && (
        <div className={styles.answerBox}>
          <p className={styles.answer}>{answer}</p>
          
          {/* Render strict citations */}
          {citations && citations.length > 0 && (
            <div className={styles.citations}>
              <p className={styles.citationTitle}>
                Verified Citations
              </p>
              {citations.map((cit, idx) => (
                <blockquote 
                  key={idx} 
                  className={styles.quote}
                >
                  &quot;{cit.quote}&quot; <br/>
                  <span className={styles.chapterTitle}>
                    — {cit.chapter_title}
                  </span>
                </blockquote>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
