"use client";

import React, { useState } from "react";

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
    <div style={{ marginTop: "3rem", padding: "1.5rem", backgroundColor: "#1e1e1e", borderRadius: "8px", border: "1px solid #333" }}>
      <h3 style={{ marginBottom: "1rem", color: "#0070f3" }}>🧠 Ask the Lore-Master</h3>
      <p style={{ fontSize: "0.9rem", color: "#a0a0a0", marginBottom: "1rem" }}>
        Forget a character&apos;s name or a piece of lore? Ask the AI to search the published chapters!
      </p>
      
      <form onSubmit={askQuestion} style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        <input 
          type="text" 
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. What is the name of the artifact in the goblin cave?" 
          style={{ 
            flex: 1, 
            padding: "0.75rem", 
            borderRadius: "6px", 
            backgroundColor: "#252525", 
            color: "white", 
            border: "1px solid #444",
            outline: "none"
          }}
        />
        <button 
          type="submit" 
          disabled={loading || !question.trim()} 
          style={{ 
            padding: "0.75rem 1.5rem", 
            backgroundColor: loading || !question.trim() ? "#333" : "#0070f3", 
            color: loading || !question.trim() ? "#888" : "white", 
            borderRadius: "6px", 
            border: "none", 
            cursor: loading || !question.trim() ? "not-allowed" : "pointer",
            fontWeight: "bold",
            transition: "background-color 0.2s"
          }}
        >
          {loading ? "Searching..." : "Ask"}
        </button>
      </form>

      {answer && (
        <div style={{ backgroundColor: "#252525", padding: "1.5rem", borderRadius: "6px", border: "1px solid #444" }}>
          <p style={{ lineHeight: "1.6", color: "#e0e0e0" }}>{answer}</p>
          
          {/* Render strict citations */}
          {citations && citations.length > 0 && (
            <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px dashed #555" }}>
              <p style={{ fontSize: "0.85rem", color: "#a0a0a0", marginBottom: "0.75rem", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Verified Citations
              </p>
              {citations.map((cit, idx) => (
                <blockquote 
                  key={idx} 
                  style={{ 
                    fontSize: "0.9rem", 
                    borderLeft: "3px solid #0070f3", 
                    paddingLeft: "1rem", 
                    margin: "0.75rem 0", 
                    color: "#ccc",
                    backgroundColor: "#1a1a1a",
                    padding: "0.75rem 1rem",
                    borderRadius: "0 6px 6px 0"
                  }}
                >
                  &quot;{cit.quote}&quot; <br/>
                  <span style={{ color: "#0070f3", fontSize: "0.8rem", display: "inline-block", marginTop: "8px", fontWeight: "500" }}>
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