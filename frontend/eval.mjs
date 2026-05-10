// eval.mjs (Run via: npm run test:deployment)
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './.env.local' });
dotenv.config();

const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

const allowGeminiFailures = process.env.EVAL_ALLOW_GEMINI_FAILURES === 'true';

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

if (!process.env.GEMINI_API_KEY) {
  if (allowGeminiFailures) {
    console.warn('Skipping deployment eval because GEMINI_API_KEY is not configured.');
    process.exit(0);
  }

  console.error('Missing required environment variable: GEMINI_API_KEY');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const embeddingModel = 'gemini-embedding-2';
const answerModel = 'gemini-2.5-flash';

const citationSchema = {
  type: Type.OBJECT,
  properties: {
    answer: {
      type: Type.STRING,
      description: "The direct answer to the user's question based ONLY on context.",
    },
    citations: {
      type: Type.ARRAY,
      description: 'Direct quotes from the context that prove the answer.',
      items: {
        type: Type.OBJECT,
        properties: {
          quote: { type: Type.STRING },
          chapter_title: { type: Type.STRING },
        },
      },
    },
  },
  required: ['answer', 'citations'],
};

function loadTestCases() {
  if (process.env.EVAL_CASES_JSON) {
    return JSON.parse(process.env.EVAL_CASES_JSON);
  }

  const {
    EVAL_NOVEL_ID,
    EVAL_NOVEL_TITLE,
    EVAL_CHAPTER_TITLE,
    EVAL_QUESTION,
    EVAL_EXPECTED_CONCEPT,
  } = process.env;

  if ((EVAL_NOVEL_ID || EVAL_NOVEL_TITLE) && EVAL_QUESTION && EVAL_EXPECTED_CONCEPT) {
    return [
      {
        novelId: EVAL_NOVEL_ID,
        novelTitle: EVAL_NOVEL_TITLE,
        chapterTitle: EVAL_CHAPTER_TITLE,
        question: EVAL_QUESTION,
        expectedConcept: EVAL_EXPECTED_CONCEPT,
      },
    ];
  }

  console.error(
    'No deployment eval cases configured. Set EVAL_NOVEL_TITLE, EVAL_QUESTION, and EVAL_EXPECTED_CONCEPT, or provide EVAL_CASES_JSON.'
  );
  process.exit(1);
}

function validateTestCase(test, index) {
  const missingFields = ['question', 'expectedConcept'].filter((field) => !test[field]);

  if (missingFields.length > 0) {
    throw new Error(`Eval case ${index + 1} is missing: ${missingFields.join(', ')}`);
  }

  if (!test.novelId && !test.novelTitle) {
    throw new Error(`Eval case ${index + 1} must include novelTitle or novelId.`);
  }
}

function getEmbeddingValues(embeddingResponse) {
  const values = embeddingResponse.embeddings?.[0]?.values;

  if (!values) {
    throw new Error('Gemini did not return embedding values.');
  }

  return values;
}

function formatContext(chapters) {
  return chapters
    .map((chapter) => `[Chapter: ${chapter.title ?? 'Untitled'}]\n${chapter.content}`)
    .join('\n\n---\n\n');
}

function includesExpectedConcept(answer, expectedConcept) {
  return answer.toLowerCase().includes(expectedConcept.toLowerCase());
}

function isGeminiAvailabilityError(error) {
  const status = Number(error?.status ?? error?.code ?? error?.cause?.status);
  const message = `${error?.message ?? ''} ${JSON.stringify(error?.error ?? {})}`;

  return (
    [401, 403, 408, 429, 500, 502, 503, 504].includes(status) ||
    /api key|auth|unauthorized|forbidden|permission|expired|quota|rate limit|resource_exhausted|unavailable|deadline|timeout|fetch failed/i.test(message)
  );
}

function handleGeminiFailure(error) {
  if (allowGeminiFailures && isGeminiAvailabilityError(error)) {
    console.warn('Skipping deployment eval because Gemini is unavailable or credentials/quota are not usable.');
    console.warn(error?.message ?? error);
    process.exit(0);
  }

  throw error;
}

async function embedQuestion(question) {
  try {
    return await ai.models.embedContent({
      model: embeddingModel,
      contents: question,
      config: {
        outputDimensionality: 768,
      },
    });
  } catch (error) {
    handleGeminiFailure(error);
  }
}

async function generateAnswer(prompt) {
  try {
    return await ai.models.generateContent({
      model: answerModel,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: citationSchema,
        temperature: 0.1,
      },
    });
  } catch (error) {
    handleGeminiFailure(error);
  }
}

async function resolveNovelId(test) {
  if (test.novelId) {
    return test.novelId;
  }

  const { data: novels, error } = await supabase
    .from('novels')
    .select('id, title')
    .eq('title', test.novelTitle);

  if (error) {
    throw new Error(`Could not resolve eval novel "${test.novelTitle}": ${error.message}`);
  }

  if (!novels || novels.length === 0) {
    throw new Error(`No eval novel found with title "${test.novelTitle}".`);
  }

  if (novels.length > 1) {
    throw new Error(`Multiple eval novels found with title "${test.novelTitle}". Use a unique title or EVAL_NOVEL_ID.`);
  }

  return novels[0].id;
}

async function verifyChapterFixture(novelId, chapterTitle) {
  if (!chapterTitle) {
    return;
  }

  const { data: chapter, error } = await supabase
    .from('chapters')
    .select('id')
    .eq('novel_id', novelId)
    .eq('title', chapterTitle)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not verify eval chapter "${chapterTitle}": ${error.message}`);
  }

  if (!chapter) {
    throw new Error(`No eval chapter found with title "${chapterTitle}" for this novel.`);
  }
}

async function runEvaluation() {
  console.log('Starting deployment RAG evaluation...');

  const testCases = loadTestCases();
  
  for (const [index, test] of testCases.entries()) {
    validateTestCase(test, index);
    console.log(`\nTesting Question: "${test.question}"`);

    const novelId = await resolveNovelId(test);
    await verifyChapterFixture(novelId, test.chapterTitle);
    
    const embedRes = await embedQuestion(test.question);
    const queryEmbedding = getEmbeddingValues(embedRes);
    
    const { data: matchedChapters, error } = await supabase.rpc('hybrid_search_chapters', {
      query_text: test.question, 
      query_embedding: queryEmbedding, 
      match_count: 3, 
      search_novel_id: novelId,
    });

    if (error || !matchedChapters || matchedChapters.length === 0) {
      console.error('TEST FAILED. Could not retrieve chapters from Supabase.');
      if (error) console.error('Database Error:', error);
      process.exit(1);
    }

    const contextText = formatContext(matchedChapters);
    const prompt = `You are an enterprise-grade document assistant. Answer the user's question using ONLY the provided context. You MUST provide exact string quotes from the text as citations to prove your answer.\n\nContext:\n${contextText}\n\nQuestion: ${test.question}`;

    const completion = await generateAnswer(prompt);

    const result = JSON.parse(completion.text);
    const answer = result.answer ?? '';

    if (includesExpectedConcept(answer, test.expectedConcept)) {
      console.log(`TEST PASSED. Answer provided: ${answer.substring(0, 120)}...`);
      console.log(`Citations returned: ${result.citations?.length ?? 0}`);
    } else {
      console.error('TEST FAILED.');
      console.error(`Expected: ${test.expectedConcept}\nGot: ${answer}`);
      process.exit(1);
    }
  }
  
  console.log('\nAll deployment tests passed. Safe to deploy.');
}

runEvaluation().catch((error) => {
  console.error('Deployment evaluation failed:', error);
  process.exit(1);
});
