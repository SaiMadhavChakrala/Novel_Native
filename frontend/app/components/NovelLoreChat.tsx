"use client";

import React, { useState } from "react";
import styles from "../styles/NovelLoreChat.module.css";

// Define the citation structure based on our enterprise API schema
interface Citation {
  quote: string;
  chapter_title: string;
}

interface ToolTrace {
  displayName: string;
  name: string;
  summary: string;
}

export default function NovelLoreChat({ novelId, canUseAgent = false }: { novelId: string; canUseAgent?: boolean }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [tools, setTools] = useState<ToolTrace[]>([]);
  const [agentMode, setAgentMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const askQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    setLoading(true);
    setAnswer("");
    setCitations([]);
    setTools([]);

    try {
      const res = await fetch("/api/ask-novel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, novelId, mode: canUseAgent && agentMode ? "agent" : "lore" }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        setAnswer(data.error);
      } else {
        setAnswer(data.answer);
        if (data.citations) {
          setCitations(data.citations);
        }
        if (data.tools) {
          setTools(data.tools);
        }
      }
    } catch {
      setAnswer("Sorry, the lore-master is currently asleep. Please try again later.");
    }
    setLoading(false);
  };

  return (
    <div className={styles.chatBox}>
      <h3 className={styles.title}>🧠 Ask the Lore-Master</h3>
      <p className={styles.intro}>
        Forget a character&apos;s name or a piece of lore? Ask the AI to search the chapters available to you.
      </p>

      {canUseAgent && (
        <div className={styles.modeSwitch} aria-label="Chat mode">
          <button
            type="button"
            className={`${styles.modeButton} ${!agentMode ? styles.modeButtonActive : ""}`}
            onClick={() => setAgentMode(false)}
          >
            Lore Q&amp;A
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${agentMode ? styles.modeButtonActive : ""}`}
            onClick={() => setAgentMode(true)}
          >
            Continuity Agent
          </button>
        </div>
      )}
      
      <form onSubmit={askQuestion} className={styles.form}>
        <input 
          type="text" 
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What is the name of the artifact?" 
          className={styles.input}
        />
        <button 
          type="submit" 
          disabled={loading || !question.trim()} 
          className={styles.button}
        >
          {loading ? "Working..." : agentMode && canUseAgent ? "Run" : "Ask"}
        </button>
      </form>

      {answer && (
        <div className={styles.answerBox}>
          <p className={styles.answer}>{answer}</p>

          {tools.length > 0 && (
            <div className={styles.tools}>
              <p className={styles.toolTitle}>MCP Tools Used</p>
              <ul className={styles.toolList}>
                {tools.map((tool) => (
                  <li key={`${tool.name}-${tool.summary}`}>
                    <span>{tool.displayName}</span>
                    <small>{tool.summary}</small>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
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
