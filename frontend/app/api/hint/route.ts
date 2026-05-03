import { NextResponse } from "next/server";
import Groq from "groq-sdk";

// Inițializăm clientul Groq
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { level, userQuestion } = body;

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ hint: "Groq API key is missing." }, { status: 500 });
    }

    // Apelăm modelul Llama 3
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a mysterious spirit in an escape room (Level ${level}). 
                    Your job is to LISTEN to the player's question and provide a helpful but cryptic HINT. 
                    Do not ignore the question. Keep your answer under 2 sentences.`
        },
        {
          role: "user",
          // Ne asigurăm că prompt-ul forțează legătura cu întrebarea
          content: `The player is stuck and asks: "${userQuestion}". Give them a hint based strictly on this.`
        },
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      max_tokens: 150,
    });

    const aiText = chatCompletion.choices[0]?.message?.content || "The spirits are silent...";

    return NextResponse.json({ hint: aiText });
  } catch (error: any) {
    console.error("Groq Error:", error);
    return NextResponse.json(
      { hint: "The connection to the underworld was severed." },
      { status: 500 }
    );
  }
}