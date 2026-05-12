import { NextResponse } from "next/server";

const RIDDLES = {
  1: {
    riddle: "I have cities, but no houses live there. I have mountains, but no trees grow there. I have water, but no fish swim there. I have roads, but no cars drive there. What am I?",
    concept: "a map"
  },
  2: {
    riddle: "The alchemist mixes the tears of a cloud with the breath of the earth and the blood of the sun. What potion does he brew?",
    concept: "rain / storm / water cycle (accept creative descriptions involving these elements)"
  },
  3: {
    riddle: "I am always in front of you but can never be seen. I am the space between a heartbeat and a breath. What am I?",
    concept: "the future / time / a moment"
  }
};

export async function POST(req: Request) {
  try {
    const { riddleNumber, answer } = await req.json();

    if (!riddleNumber || !answer) {
      return NextResponse.json({ error: "Missing riddleNumber or answer" }, { status: 400 });
    }

    const riddleData = RIDDLES[riddleNumber as keyof typeof RIDDLES];
    if (!riddleData) {
      return NextResponse.json({ error: "Invalid riddle number" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is missing.");
      return NextResponse.json({ isCorrect: false, feedback: "The alchemist's spirit is unavailable (Missing API Key)." }, { status: 500 });
    }

    const prompt = `
You are an ancient alchemist validating answers to riddles in an escape room.
The player is answering Riddle #${riddleNumber}:
"${riddleData.riddle}"

The expected concept is: **${riddleData.concept}**.

The player's answer is: "${answer}".

Does the player's answer correctly capture the expected concept? 
Accept typos, variations, and creative descriptions if they capture the essence. Be fairly generous.

Return ONLY a JSON object with this exact structure:
{
  "isCorrect": boolean,
  "feedback": "A short, mystical, atmospheric feedback message for the player. If correct, congratulate them cryptically. If incorrect, give a subtle hint without revealing the answer."
}
`;

    // Fetch direct to Google AI using v1beta and the latest flash model
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Google API Fetch Error:", data);
      return NextResponse.json({ isCorrect: false, feedback: "The connection to the other world has failed." }, { status: response.status });
    }

    let responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Strip markdown formatting if Gemini includes it
    responseText = responseText.trim();
    if (responseText.startsWith("```json")) {
      responseText = responseText.substring(7);
    } else if (responseText.startsWith("```")) {
      responseText = responseText.substring(3);
    }
    if (responseText.endsWith("```")) {
      responseText = responseText.substring(0, responseText.length - 3);
    }
    
    const parsed = JSON.parse(responseText.trim());

    return NextResponse.json({
      isCorrect: parsed.isCorrect || false,
      feedback: parsed.feedback || "The magic flickers and fades..."
    });

  } catch (error) {
    console.error("Validation Error:", error);
    return NextResponse.json({ isCorrect: false, feedback: "The magic flickers and fades... try again." }, { status: 500 });
  }
}
