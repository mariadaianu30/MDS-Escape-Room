"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Morse Code Dictionary ───────────────────────────────────────────────────
const MORSE_MAP: Record<string, string> = {
  A: ".-",    B: "-...",  C: "-.-.",  D: "-..",
  E: ".",     F: "..-.",  G: "--.",   H: "....",
  I: "..",    J: ".---",  K: "-.-",   L: ".-..",
  M: "--",    N: "-.",    O: "---",   P: ".--.",
  Q: "--.-",  R: ".-.",   S: "...",   T: "-",
  U: "..-",   V: "...-",  W: ".--",   X: "-..-",
  Y: "-.--",  Z: "--..",
  "0": "-----", "1": ".----", "2": "..---",
  "3": "...--", "4": "....-", "5": ".....",
  "6": "-....", "7": "--...", "8": "---..",
  "9": "----.",
};

function textToMorse(text: string): string {
  return text
    .toUpperCase()
    .split("")
    .map((c) => (c === " " ? "/" : (MORSE_MAP[c] ?? "?")))
    .join(" ");
}

// ─── Puzzle definitions ───────────────────────────────────────────────────────
interface Puzzle {
  id: number;
  title: string;
  flavor: string;
  encoded: string;   // what the player sees
  answer: string;    // expected decoded answer (uppercase)
  successMsg: string;
}

const PUZZLES: Puzzle[] = [
  {
    id: 1,
    title: "Inscripția de pe Criptă",
    flavor:
      "Pe peretele de piatră, cifrat în semne vechi, stă ascuns un cuvânt. Descifrează-l ca să deschizi primul zăvor.",
    encoded: textToMorse("OPEN"),
    answer: "OPEN",
    successMsg: "Primul zăvor cedează. Un ecou răsună în criptă...",
  },
  {
    id: 2,
    title: "Mesajul Arhivistului",
    flavor:
      "Un pergament îngălbenit conține instrucțiunile finale ale arhivistului. Numai cine cunoaște codul poate continua.",
    encoded: textToMorse("CIPHER"),
    answer: "CIPHER",
    successMsg: "Corect! Ușa criptei se deschide — ieșirea este în față!",
  },
];

// ─── Hint cooldown (seconds) ─────────────────────────────────────────────────
const HINT_COOLDOWN = 60;

// ─── Component ────────────────────────────────────────────────────────────────
export default function Level4Page() {
  const router = useRouter();

  const [stage, setStage] = useState<"intro" | "puzzle" | "complete">("intro");
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showMorse, setShowMorse] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPuzzle = PUZZLES[puzzleIndex];

  // ── Cooldown ticker ──
  useEffect(() => {
    if (cooldown > 0) {
      intervalRef.current = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cooldown]);

  // ── Submit answer ──
  const handleSubmit = useCallback(() => {
    const trimmed = input.trim().toUpperCase();
    if (trimmed === currentPuzzle.answer) {
      setSuccessFlash(true);
      setHint(null);
      setTimeout(() => {
        setSuccessFlash(false);
        if (puzzleIndex + 1 < PUZZLES.length) {
          setPuzzleIndex((i) => i + 1);
          setInput("");
        } else {
          setStage("complete");
        }
      }, 1800);
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setInput("");
    }
  }, [input, currentPuzzle, puzzleIndex]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  // ── Ask for hint ──
  const handleHint = async () => {
    if (cooldown > 0 || hintLoading) return;
    setHintLoading(true);
    setHint(null);
    setCooldown(HINT_COOLDOWN);

    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: 4,
          puzzleId: currentPuzzle.id,
          puzzleTitle: currentPuzzle.title,
          encoded: currentPuzzle.encoded,
          type: "morse",
        }),
      });
      const data = await res.json();
      setHint(data.hint ?? "Privește cu atenție semnele. Nu totul e cum pare.");
    } catch {
      setHint("Spiritele criptei tac deocamdată. Încearcă din nou mai târziu.");
    } finally {
      setHintLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Crimson+Pro:ital,wght@0,300;0,400;1,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:       #0a0705;
          --stone:    #1a1510;
          --border:   #3d2f1e;
          --gold:     #c9a84c;
          --gold-dim: #7a5e28;
          --rust:     #8b3a2a;
          --green:    #4a7c59;
          --text:     #d4c4a8;
          --muted:    #6b5a44;
          --glow:     0 0 18px rgba(201,168,76,0.35);
        }

        body { background: var(--bg); }

        .crypt-root {
          min-height: 100vh;
          background: var(--bg);
          background-image:
            radial-gradient(ellipse 70% 60% at 50% 0%, #2a1a08 0%, transparent 70%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='none' stroke='%23231a0d' stroke-width='0.5'/%3E%3C/svg%3E");
          font-family: 'Crimson Pro', serif;
          color: var(--text);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 1rem 4rem;
          position: relative;
          overflow-x: hidden;
        }

        /* Scanline overlay */
        .crypt-root::after {
          content: '';
          position: fixed; inset: 0;
          background: repeating-linear-gradient(
            0deg, transparent, transparent 3px,
            rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px
          );
          pointer-events: none;
          z-index: 100;
        }

        /* ─ Header ─ */
        .header {
          text-align: center;
          margin-bottom: 3rem;
          position: relative;
        }
        .level-badge {
          font-family: 'Cinzel', serif;
          font-size: 0.65rem;
          letter-spacing: 0.3em;
          color: var(--gold-dim);
          text-transform: uppercase;
          margin-bottom: 0.6rem;
        }
        .level-title {
          font-family: 'Cinzel', serif;
          font-size: clamp(1.8rem, 5vw, 3rem);
          font-weight: 900;
          color: var(--gold);
          text-shadow: var(--glow), 0 2px 40px rgba(201,168,76,0.2);
          line-height: 1.1;
          letter-spacing: 0.05em;
        }
        .level-subtitle {
          font-size: 1rem;
          font-style: italic;
          color: var(--muted);
          margin-top: 0.5rem;
          letter-spacing: 0.05em;
        }
        .divider {
          width: 200px;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--gold-dim), transparent);
          margin: 1rem auto 0;
        }

        /* ─ Intro Card ─ */
        .card {
          background: var(--stone);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 2.5rem 2rem;
          max-width: 680px;
          width: 100%;
          position: relative;
          box-shadow: 0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(201,168,76,0.08);
        }
        .card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 4px;
          background: linear-gradient(135deg, rgba(201,168,76,0.04) 0%, transparent 50%);
          pointer-events: none;
        }
        .card-title {
          font-family: 'Cinzel', serif;
          font-size: 1.1rem;
          color: var(--gold);
          letter-spacing: 0.1em;
          margin-bottom: 1rem;
        }
        .card-body {
          font-size: 1.05rem;
          line-height: 1.8;
          color: var(--text);
          font-weight: 300;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 1.8rem;
          padding: 0.75rem 2rem;
          background: transparent;
          border: 1px solid var(--gold-dim);
          color: var(--gold);
          font-family: 'Cinzel', serif;
          font-size: 0.8rem;
          letter-spacing: 0.2em;
          cursor: pointer;
          transition: all 0.2s;
          border-radius: 2px;
        }
        .btn:hover {
          background: rgba(201,168,76,0.08);
          border-color: var(--gold);
          box-shadow: var(--glow);
        }
        .btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* ─ Puzzle Layout ─ */
        .puzzle-wrap {
          width: 100%;
          max-width: 720px;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .progress-row {
          display: flex;
          gap: 0.5rem;
          justify-content: center;
        }
        .pip {
          width: 32px; height: 4px;
          border-radius: 2px;
          background: var(--border);
          transition: background 0.4s;
        }
        .pip.done { background: var(--gold); }
        .pip.active { background: var(--gold-dim); }

        /* Encoded message display */
        .morse-display {
          background: #060402;
          border: 1px solid var(--border);
          border-left: 3px solid var(--rust);
          border-radius: 2px;
          padding: 1.5rem 1.8rem;
          font-family: 'Courier New', monospace;
          font-size: clamp(1rem, 3vw, 1.4rem);
          color: #e8d8a0;
          letter-spacing: 0.15em;
          word-break: break-all;
          line-height: 2;
          text-shadow: 0 0 8px rgba(232,216,160,0.4);
        }
        .morse-label {
          font-family: 'Cinzel', serif;
          font-size: 0.6rem;
          letter-spacing: 0.25em;
          color: var(--rust);
          text-transform: uppercase;
          margin-bottom: 0.5rem;
        }

        /* Input area */
        .input-row {
          display: flex;
          gap: 0.75rem;
        }
        .decode-input {
          flex: 1;
          background: var(--stone);
          border: 1px solid var(--border);
          border-radius: 2px;
          padding: 0.8rem 1.2rem;
          color: var(--text);
          font-family: 'Cinzel', serif;
          font-size: 1rem;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .decode-input:focus {
          border-color: var(--gold-dim);
          box-shadow: 0 0 0 2px rgba(201,168,76,0.12);
        }
        .decode-input::placeholder { color: var(--muted); font-size: 0.85rem; letter-spacing: 0.1em; }

        .btn-submit {
          padding: 0.8rem 1.6rem;
          background: var(--rust);
          border: none;
          color: #f5e8d0;
          font-family: 'Cinzel', serif;
          font-size: 0.75rem;
          letter-spacing: 0.2em;
          cursor: pointer;
          border-radius: 2px;
          transition: background 0.2s, box-shadow 0.2s;
        }
        .btn-submit:hover { background: #a3452f; box-shadow: 0 0 12px rgba(139,58,42,0.5); }

        /* Shake animation */
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        .shake { animation: shake 0.45s ease; }

        /* Success flash */
        @keyframes flashGold {
          0% { box-shadow: none; }
          50% { box-shadow: 0 0 40px rgba(201,168,76,0.5), inset 0 0 20px rgba(201,168,76,0.1); }
          100% { box-shadow: none; }
        }
        .flash-success { animation: flashGold 1.8s ease; }

        /* Hint section */
        .hint-section {
          border-top: 1px solid var(--border);
          padding-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .hint-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .btn-hint {
          padding: 0.55rem 1.2rem;
          background: transparent;
          border: 1px solid var(--green);
          color: #7ab892;
          font-family: 'Cinzel', serif;
          font-size: 0.68rem;
          letter-spacing: 0.2em;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .btn-hint:hover:not(:disabled) { background: rgba(74,124,89,0.12); box-shadow: 0 0 10px rgba(74,124,89,0.3); }
        .btn-hint:disabled { opacity: 0.35; cursor: not-allowed; }
        .cooldown-text {
          font-size: 0.8rem;
          color: var(--muted);
          font-style: italic;
        }
        .hint-bubble {
          background: rgba(74,124,89,0.08);
          border: 1px solid rgba(74,124,89,0.3);
          border-radius: 2px;
          padding: 0.9rem 1.1rem;
          font-size: 0.95rem;
          font-style: italic;
          color: #9dcaab;
          line-height: 1.7;
        }
        .hint-loading {
          display: flex; align-items: center; gap: 0.6rem;
          color: var(--muted); font-size: 0.9rem; font-style: italic;
        }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .dot-pulse span { animation: pulse 1.2s ease infinite; display: inline-block; }
        .dot-pulse span:nth-child(2) { animation-delay: 0.2s; }
        .dot-pulse span:nth-child(3) { animation-delay: 0.4s; }

        /* Morse reference */
        .morse-ref-toggle {
          font-size: 0.8rem;
          color: var(--muted);
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.2s;
          background: none; border: none; font-family: inherit;
        }
        .morse-ref-toggle:hover { color: var(--text); }
        .morse-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
          gap: 0.35rem;
          margin-top: 0.75rem;
          padding: 1rem;
          background: #060402;
          border: 1px solid var(--border);
          border-radius: 2px;
          font-family: 'Courier New', monospace;
          font-size: 0.75rem;
        }
        .morse-item {
          display: flex; gap: 0.4rem; align-items: center;
        }
        .morse-letter { color: var(--gold-dim); font-weight: bold; width: 14px; }
        .morse-code { color: #a09070; }

        /* Complete screen */
        .complete-wrap {
          text-align: center;
          max-width: 540px;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .complete-wrap { animation: fadeInUp 0.7s ease; }
        .complete-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          filter: drop-shadow(0 0 12px rgba(201,168,76,0.6));
        }
        .complete-title {
          font-family: 'Cinzel', serif;
          font-size: 2rem;
          color: var(--gold);
          text-shadow: var(--glow);
          margin-bottom: 0.75rem;
        }
        .complete-body {
          font-size: 1.05rem;
          line-height: 1.8;
          color: var(--text);
          font-style: italic;
          margin-bottom: 2rem;
        }
      `}</style>

      <div className="crypt-root">
        {/* ── Header ── */}
        <header className="header">
          <p className="level-badge">Nivel IV · Escape Room</p>
          <h1 className="level-title">The Crypt of Codes</h1>
          <p className="level-subtitle">
            &ldquo;Lumina nu ajunge aici. Numai mintea poate deschide întunericul.&rdquo;
          </p>
          <div className="divider" />
        </header>

        {/* ══════════════════════ INTRO ══════════════════════ */}
        {stage === "intro" && (
          <div className="card">
            <p className="card-title">⚰ Bine ai venit în Cryptă</p>
            <p className="card-body">
              Arhivistul a ascuns două mesaje cifrate în codul Morse — un limbaj
              al punctelor și liniilor inventat de navigatori. Fiecare mesaj
              blochează câte un zăvor. Descifrează-le pe ambele ca să ieși.
              <br /><br />
              <strong style={{ color: "var(--gold-dim)" }}>Regulă:</strong>{" "}
              <code style={{ fontFamily: "Courier New", fontSize: "0.9em" }}>·</code> = punct,{" "}
              <code style={{ fontFamily: "Courier New", fontSize: "0.9em" }}>-</code> = linie,{" "}
              spațiu = separator litere, <code style={{ fontFamily: "Courier New", fontSize: "0.9em" }}>/</code> = separator cuvinte.
            </p>
            <button className="btn" onClick={() => setStage("puzzle")}>
              ▶ &nbsp; INTRĂ ÎN CRIPTĂ
            </button>
          </div>
        )}

        {/* ══════════════════════ PUZZLE ══════════════════════ */}
        {stage === "puzzle" && (
          <div className="puzzle-wrap">
            {/* Progress pips */}
            <div className="progress-row">
              {PUZZLES.map((p, i) => (
                <div
                  key={p.id}
                  className={`pip ${i < puzzleIndex ? "done" : i === puzzleIndex ? "active" : ""}`}
                />
              ))}
            </div>

            {/* Puzzle card */}
            <div className={`card ${shake ? "shake" : ""} ${successFlash ? "flash-success" : ""}`}>
              <p className="card-title">
                🔒 Puzzle {currentPuzzle.id} — {currentPuzzle.title}
              </p>
              <p className="card-body" style={{ marginBottom: "1.5rem" }}>
                {currentPuzzle.flavor}
              </p>

              {/* Encoded message */}
              <div>
                <p className="morse-label">▸ Mesaj cifrat în Morse</p>
                <div className="morse-display">{currentPuzzle.encoded}</div>
              </div>

              {/* Input */}
              <div className="input-row" style={{ marginTop: "1.2rem" }}>
                <input
                  className="decode-input"
                  placeholder="Scrie răspunsul descifrat..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  autoFocus
                  autoComplete="off"
                />
                <button className="btn-submit" onClick={handleSubmit}>
                  TRIMITE
                </button>
              </div>

              {/* Hint section */}
              <div className="hint-section" style={{ marginTop: "1.5rem" }}>
                <div className="hint-row">
                  <button
                    className="btn-hint"
                    onClick={handleHint}
                    disabled={cooldown > 0 || hintLoading}
                  >
                    🕯 CERE INDICIU (AI)
                  </button>
                  {cooldown > 0 && (
                    <span className="cooldown-text">
                      Spiritele se odihnesc... {cooldown}s
                    </span>
                  )}
                </div>

                {hintLoading && (
                  <div className="hint-loading">
                    <span className="dot-pulse">
                      <span>·</span><span>·</span><span>·</span>
                    </span>
                    Spiritele consultă arhivele
                  </div>
                )}

                {hint && !hintLoading && (
                  <div className="hint-bubble">🗝 {hint}</div>
                )}
              </div>

              {/* Morse reference toggle */}
              <div style={{ marginTop: "1.2rem" }}>
                <button
                  className="morse-ref-toggle"
                  onClick={() => setShowMorse((v) => !v)}
                >
                  {showMorse ? "▴ Ascunde" : "▾ Arată"} tabelul Morse
                </button>
                {showMorse && (
                  <div className="morse-grid">
                    {Object.entries(MORSE_MAP)
                      .filter(([k]) => isNaN(Number(k)))
                      .map(([letter, code]) => (
                        <div className="morse-item" key={letter}>
                          <span className="morse-letter">{letter}</span>
                          <span className="morse-code">{code}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════ COMPLETE ══════════════════════ */}
        {stage === "complete" && (
          <div className="complete-wrap">
            <div className="complete-icon">🏛</div>
            <h2 className="complete-title">Criptă Deschisă!</h2>
            <p className="complete-body">
              Ai descifrat ambele mesaje ale Arhivistului. Cunoașterea este
              cheia cea mai puternică — iar tu ai dovedit că o stăpânești.
            </p>
            <button
              className="btn"
              onClick={() => router.push("/level5")}
            >
              ▶ &nbsp; NIVELUL URMĂTOR
            </button>
          </div>
        )}
      </div>
    </>
  );
}
