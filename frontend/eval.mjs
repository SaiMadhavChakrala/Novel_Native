// eval.mjs (Run via: node eval.mjs)
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Define your "Golden Dataset" of questions and the correct answers
const testCases = [
  {
    // 👇 UPDATE THESE 3 LINES BEFORE RUNNING 👇
    novelId: "206f131e-e52b-461a-9bc9-d3aede18e7c7", // This is the ID from your recent logs!
    question: "What is the name of the protagonist's sword?", 
    expectedConcept: "Shadowblade" 
  }
];

async function runEvaluation() {
  console.log("🚀 Starting CI/CD RAG Evaluation Pipeline...");
  
  for (const test of testCases) {
    console.log(`\nTesting Question: "${test.question}"`);
    
    // 1. Hit your backend logic (UPDATED TO NEW GEMINI MODEL + 768 DIMS)
    const embedRes = await ai.models.embedContent({ 
      model: 'gemini-embedding-2', 
      contents: test.question,
      config: {
        outputDimensionality: 768
      }
    });
    const queryEmbedding = embedRes.embeddings[0].values;
    
    const { data: matchedChapters, error } = await supabase.rpc('hybrid_search_chapters', {
      query_text: test.question, 
      query_embedding: queryEmbedding, 
      match_count: 3, 
      search_novel_id: test.novelId,
      accessible_chapter_count: null,
    });

    if (error || !matchedChapters || matchedChapters.length === 0) {
      console.error("❌ TEST FAILED. Could not retrieve chapters from Supabase.");
      if (error) console.error("Database Error:", error);
      process.exit(1);
    }

    const contextText = matchedChapters.map(ch => ch.content).join("\n");

    const completion = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Context: ${contextText}\n\nQuestion: ${test.question}`,
    });
    
    const answer = completion.text;

    // 2. LLM-as-a-Judge (Cross-Encoder Evaluation)
    console.log("⚖️ Grading Answer...");
    const gradingPrompt = `
      Evaluate the AI's answer based on the Expected Concept.
      Expected Concept: ${test.expectedConcept}
      Actual Answer: ${answer}
      
      Does the Actual Answer correctly contain the Expected Concept? Reply ONLY with "PASS" or "FAIL".
    `;
    
    const gradeResponse = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: gradingPrompt });
    const grade = gradeResponse.text.trim();
    
    if (grade === "PASS") {
      console.log(`✅ TEST PASSED. Answer provided: ${answer.substring(0, 80)}...`);
    } else {
      console.error(`❌ TEST FAILED.`);
      console.error(`Expected: ${test.expectedConcept}\nGot: ${answer}`);
      process.exit(1); // Fail the CI/CD pipeline
    }
  }
  
  console.log("\n🎉 All pipeline tests passed! Safe to deploy.");
}

runEvaluation();
