import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { level, puzzleTitle, encoded, userQuestion, type } = body;

    // Inițializăm modelul Gemini
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Construim contextul pentru AI
    const prompt = `
      You are a mysterious spirit from an ancient crypt in an escape room game.
      Current Context:
      - Level: ${level}
      - Puzzle: ${puzzleTitle}
      - Encoded Morse: ${encoded}
      - Game Type: ${type}
      
      The player is asking you this: "${userQuestion}"
      
      Instructions:
      1. Answer as a mysterious, helpful but cryptic spirit.
      2. Do NOT give the direct answer (the decoded word).
      3. Give a subtle hint that leads them to the solution.
      4. Keep the response short (max 2 sentences).
      5. Answer in Romanian (or the language of the question).
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return NextResponse.json({ hint: text });
  } catch (error) {
    console.error("AI Hint Error:", error);
    return NextResponse.json({ hint: "Spiritele sunt tulburate... încearcă mai târziu." }, { status: 500 });
  }
}