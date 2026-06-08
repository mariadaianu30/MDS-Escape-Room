import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = body.text;
    
    // We use a deep/creepy voice from ElevenLabs. 
    // "N2lVS1w4EtoT3dr4eOWO" is Callum (raspy, old, intense, spooky)
    const voiceId = "N2lVS1w4EtoT3dr4eOWO";  
    
    if (!process.env.ELEVENLABS_API_KEY) {
      return NextResponse.json({ error: "No ElevenLabs API key found." }, { status: 500 });
    }

    if (!text) {
       return NextResponse.json({ error: "No text provided." }, { status: 400 });
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        }
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs API error:", errText);
      return NextResponse.json({ error: "Failed to fetch audio from ElevenLabs" }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    
    return new NextResponse(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error("TTS Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
