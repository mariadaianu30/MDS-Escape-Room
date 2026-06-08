import { NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST() {
  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "No Groq API key found" }, { status: 500 });
  }

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  const prompt = `You are an AI generating a dynamic puzzle for an escape room level (Level 2: The Alchemist's Lab).
Generate a JSON object with the following structure exactly. Do not include markdown formatting or extra text outside the JSON.
{
  "journalTitle": "A mystic, dark title for the parchment (e.g. 'The Night Formula — written under a blood eclipse')",
  "journalIntro": "A cryptic 1-2 sentence introduction about alchemy, elements, and the three gates.",
  "gates": [
    {
      "textBefore": "Text before the missing word. Must hint at the missing word.",
      "missingWord": "A single alchemical verb, lowercase (e.g., 'purify', 'sublime', 'calcinate', 'distill', 'conjoin', 'transmute')",
      "textAfter": "Text after the missing word."
    },
    ... (generate exactly 3 gates)
  ],
  "riddles": [
    {
      "text": "A riddle asking to identify a real, well-known chemical element (e.g., 'I am a liquid metal at room temperature...'). End with 'What element am I?'.",
      "answer": "The exact 1-word element name (e.g., 'mercury')",
      "hint": "A subtle clue to help them guess the element."
    },
    {
      "text": "Choose a real, common 5-8 letter chemistry or alchemy word (like 'carbon', 'silver', 'flask'). You MUST write: 'This is an anagram. Rearrange these letters to reveal a real word: [SCRAMBLED LETTERS]'.",
      "answer": "The exact 1-word original word",
      "hint": "A subtle clue about the meaning of the word."
    },
    {
      "text": "Choose a real, common chemistry or alchemy word. Encode it using a Caesar cipher shifted by +3 (A -> D, B -> E). You MUST write EXACTLY: 'Decode this ciphertext. It was encoded with a Caesar cipher shifted by +3 (A shifted to D). Reverse it by shifting backwards by 3 to find the answer. Ciphertext: [ENCODED WORD HERE]'.",
      "answer": "The exact 1-word original word",
      "hint": "A subtle clue about the meaning of the word."
    }
  ],
  "decoyFragments": [
    "verb1", "verb2", "verb3" // 3 alchemical verbs that are NOT the missing words
  ]
}

Ensure the riddles are solvable but thematic. The answers MUST be exactly one word.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "You are a JSON generator. Output ONLY valid JSON." },
        { role: "user", content: prompt }
      ],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const aiText = chatCompletion.choices[0]?.message?.content;
    if (!aiText) throw new Error("No content from Groq");

    const data = JSON.parse(aiText);
    
    // Auto-generate hints for the Scribe for the 6 fragments
    const fragments = [
      ...data.gates.map((g: any) => ({ word: g.missingWord, hint: "A necessary step in the formula." })),
      ...data.decoyFragments.map((w: string) => ({ word: w, hint: "A deceptive path." }))
    ].sort(() => Math.random() - 0.5); // Shuffle

    data.fragments = fragments;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Groq Generation Error:", error);
    // Return a fallback just in case
    return NextResponse.json({
      journalTitle: "The Ancient Formula",
      journalIntro: "The elements demand sacrifice and precision. The three gates remain sealed.",
      gates: [
        { textBefore: "The Sun's fire must ", missingWord: "calcinate", textAfter: " the base matter to white ash." },
        { textBefore: "The Moon's tears will ", missingWord: "conjoin", textAfter: " with the sulfur." },
        { textBefore: "Finally, the spirit will ", missingWord: "sublime", textAfter: " above the flask." }
      ],
      riddles: [
        { text: "I am the metal of the sun, element 79.", answer: "gold", hint: "It is very valuable." },
        { text: "This is an anagram. Rearrange these letters to reveal a real word: V I L R E S.", answer: "silver", hint: "The metal of the moon." },
        { text: "Decode this ciphertext. It was encoded with a Caesar cipher shifted by +3 (A shifted to D). Reverse it by shifting backwards by 3 to find the answer. Ciphertext: GLVWLOO", answer: "distill", hint: "To purify a liquid by heating and cooling." }
      ],
      fragments: [
        { word: "calcinate", hint: "To reduce to ash by fire." },
        { word: "conjoin", hint: "To unite elements." },
        { word: "sublime", hint: "To rise as vapor." },
        { word: "purify", hint: "To cleanse." },
        { word: "ferment", hint: "To rot and transform." },
        { word: "coagulate", hint: "To turn to solid." }
      ].sort(() => Math.random() - 0.5)
    });
  }
}
