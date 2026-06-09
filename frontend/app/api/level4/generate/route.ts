import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const FALLBACK_LIST = [
  { question: "What animal barks?", answer: "DOG" },
  { question: "What do you drink when thirsty?", answer: "WATER" },
  { question: "What shines in the sky at night?", answer: "MOON" },
  { question: "What do you use to open a door?", answer: "KEY" },
  { question: "What color is the sky on a clear day?", answer: "BLUE" },
  { question: "What do bees make?", answer: "HONEY" },
  { question: "What animal says meow?", answer: "CAT" },
  { question: "What do you wear on your feet?", answer: "SHOES" },
  { question: "What fruit is red and round?", answer: "APPLE" },
  { question: "What do you read?", answer: "BOOK" },
];

export async function POST() {
  const fallbackSelection = () => {
    // Select 3 random unique fallback questions
    const shuffled = [...FALLBACK_LIST].sort(() => 0.5 - Math.random());
    return NextResponse.json({ puzzles: shuffled.slice(0, 3) });
  };

  if (!process.env.GROQ_API_KEY) {
    return fallbackSelection();
  }

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const prompt = `Generate a JSON object containing an array of 3 puzzles for an escape room.
Each puzzle must have:
- "question": A simple, clear riddle or question in English with only one obvious answer.
- "answer": The exact answer to the question. The answer MUST be exactly one single word, maximum 5 letters long. It must contain ONLY letters A-Z (uppercase), with NO spaces, NO numbers, NO special characters, and NO diacritics.

Ensure the 3 questions are completely different from each other.
Format: { "puzzles": [ { "question": "...", "answer": "..." }, ... ] }
Do NOT include any extra text, markdown formatting, or explanations. Only valid JSON.`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a JSON generator. Output ONLY valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    const aiText = chatCompletion.choices[0]?.message?.content;
    if (!aiText) throw new Error("No content from Groq");

    const data = JSON.parse(aiText);
    
    // Validate the AI's output
    if (!Array.isArray(data.puzzles) || data.puzzles.length < 3) {
        throw new Error("Invalid format from Groq");
    }

    // Force uppercase and clean
    data.puzzles = data.puzzles.map((p: any) => ({
        question: p.question,
        answer: p.answer.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 5)
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Groq Level 4 Generation Error:", error);
    return fallbackSelection();
  }
}
