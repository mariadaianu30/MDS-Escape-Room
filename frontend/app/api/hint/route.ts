import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { level, userQuestion } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ hint: "The API key is missing." }, { status: 500 });
    }

    // Folosim fetch direct către v1 (varianta stabilă), nu v1beta
    // Încearcă acest URL exact (Gemini 1.0 Pro este cel mai compatibil model)
    const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.0-pro:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a mysterious spirit from an ancient crypt in an escape room game at level ${level}. 
                The player asks you: "${userQuestion}". 
                Give him a very short and cryptic hint without telling him the solution directly.`
              }
            ]
          }
        ]
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Google API Error:", data);
      return NextResponse.json({ hint: "The spirits refuse to answer now..." }, { status: response.status });
    }

    // Extragem textul din formatul lor de răspuns
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "The spirits fall silent...";

    return NextResponse.json({ hint: aiText });
  } catch (error) {
    console.error("Fetch Error:", error);
    return NextResponse.json({ hint: "The connection to the other world has failed." }, { status: 500 });
  }
}