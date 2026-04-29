"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Timer from "@/components/Timer";
import { useInventory } from "@/lib/InventoryContext";
import CollectibleItem from "@/components/CollectibleItem";

// Morse Code Dictionary
const MORSE_MAP: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..",
  E: ".", F: "..-.", G: "--.", H: "....",
  I: "..", J: ".---", K: "-.-", L: ".-..",
  M: "--", N: "-.", O: "---", P: ".--.",
  Q: "--.-", R: ".-.", S: "...", T: "-",
  U: "..-", V: "...-", W: ".--", X: "-..-",
  Y: "-.--", Z: "--..",
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

interface Puzzle {
  id: number;
  title: string;
  flavor: string;
  type: "morse-decode" | "morse-encode";
  encoded: string;
  answer: string;
  successMsg: string;
}

const PUZZLES: Puzzle[] = [
  {
    id: 1,
    title: "The Riddle of the Crypt",
    flavor:
      "A voice echoes from the darkness: 'I am tall when I am young, and short when I am old. What am I?' Encode your answer in Morse code.",
    type: "morse-encode",
    encoded: "I am tall when I am young, and short when I am old. What am I?",
    answer: "-.-. .- -. -.. .-.. .",
    successMsg: "The candle flickers. A passage opens in the stone wall...",
  },
  {
    id: 2,
    title: "The Crypt Inscription",
    flavor:
      "Upon the stone wall, encrypted in ancient signs, a word lies hidden. Decipher it to unlock the first bolt.",
    type: "morse-decode",
    encoded: textToMorse("OPEN"),
    answer: "OPEN",
    successMsg: "The first bolt yields. An echo reverberates through the crypt...",
  },
  {
    id: 3,
    title: "The Archivist's Message",
    flavor:
      "A yellowed parchment holds the archivist's final instructions. Only those who know the code may proceed.",
    type: "morse-decode",
    encoded: textToMorse("CIPHER"),
    answer: "CIPHER",
    successMsg: "Correct! The crypt door swings open — the exit lies ahead!",
  },
];

const HINT_COOLDOWN = 60;
const GAME_DURATION = 30 * 60;

// ─── Inventory item definitions ───────────────────────────────────────────────
const SCISSORS_ITEM = {
  id: "crypt-scissors",
  name: "Ancient Scissors",
  description: "Rusted scissors found near the crypt entrance. They could cut through old seals.",
  iconSrc: "/images/scissors.png",
};

const QUILL_ITEM = {
  id: "crypt-quill",
  name: "Archivist's Quill",
  description: "A delicate quill once used by the Archivist to inscribe coded messages.",
  iconSrc: "/images/feather_pen.jpg",
};

export default function Level4Page() {
  const router = useRouter();

  // ── Inventory — same destructure pattern as level3 ──
  const { equippedItem, setEquippedItem, removeItem, items } = useInventory();

  const [stage, setStage] = useState<"intro" | "puzzle" | "complete">("intro");
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [input, setInput] = useState("");
  const [shake, setShake] = useState(false);
  const [successFlash, setSuccessFlash] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isGameOver, setIsGameOver] = useState(false);

  // Item-use states (permanent once activated — same as lensInserted in level3)
  const [isParchmentUnsealed, setIsParchmentUnsealed] = useState(false);
  const [isQuillUsed, setIsQuillUsed] = useState(false);

  const currentPuzzle = PUZZLES[puzzleIndex];

  // Verificăm dacă itemele sunt DEJA în inventar
  const hasScissorsInInventory = items.some(i => i.id === SCISSORS_ITEM.id);
  const hasQuillInInventory = items.some(i => i.id === QUILL_ITEM.id);

  // Condiții de afișare pe ecran
  // FOARFECA: Apare dacă suntem în modul puzzle, NU o avem în buzunar și pergamentul e încă închis
  const showScissorsOnScreen = stage === "puzzle" && !hasScissorsInInventory && !isParchmentUnsealed;

  // PANA: Apare doar DUPĂ ce am tăiat pergamentul, dacă NU o avem în buzunar și dacă NU am scris deja cu ea
  const showQuillOnScreen = isParchmentUnsealed && !hasQuillInInventory && !isQuillUsed;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  useEffect(() => { setMounted(true); }, []);

  // Adaugă itemele în inventory la intrarea pe level (o singură dată)
  useEffect(() => {
    if (!mounted) return;
    const alreadyHasScissors = items.some(i => i.id === SCISSORS_ITEM.id);
    const alreadyHasQuill = items.some(i => i.id === QUILL_ITEM.id);
    //if (!alreadyHasScissors) addItem(SCISSORS_ITEM);
    //if (!alreadyHasQuill) addItem(QUILL_ITEM);
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cursor change when item is equipped (same as level3) ──
  useEffect(() => {
    if (equippedItem) {
      const item = items.find((i) => i.id === equippedItem);
      if (item?.iconSrc) document.body.style.cursor = `url(${item.iconSrc}), auto`;
    } else {
      document.body.style.cursor = "auto";
    }
    return () => { document.body.style.cursor = "auto"; };
  }, [equippedItem, items]);

  // ── Redirect if no active game ──
  useEffect(() => {
    const endTimeStr = localStorage.getItem("escapeRoomEndTime");
    if (!endTimeStr) { router.push("/"); }
  }, [router]);

  // ── Global timer loop ──
  useEffect(() => {
    if (stage === "complete" || isGameOver) return;
    const interval = setInterval(() => {
      const endTimeStr = localStorage.getItem("escapeRoomEndTime");
      if (!endTimeStr) return;
      const remaining = Math.max(0, Math.floor((parseInt(endTimeStr, 10) - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setIsGameOver(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [stage, isGameOver]);

  // ── Cooldown ticker ──
  useEffect(() => {
    if (cooldown > 0) {
      intervalRef.current = setInterval(() => {
        setCooldown((c) => {
          if (c <= 1) { if (intervalRef.current) clearInterval(intervalRef.current); return 0; }
          return c - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [cooldown]);

  // ── Click on sealed parchment area — same pattern as telescope click in level3 ──
  const handleParchmentClick = () => {
    if (isParchmentUnsealed) return;
    if (equippedItem === SCISSORS_ITEM.id) {
      setIsParchmentUnsealed(true);
      removeItem(SCISSORS_ITEM.id);
      setEquippedItem(null);
      showNotification("You cut the ancient seal. The parchment unfurls, revealing its secrets...");
    } else {
      showNotification("The parchment is sealed. Find the scissors to cut it open.");
    }
  };

  // ── Click on input area — same pattern ──
  const handleInputAreaClick = () => {
    if (isQuillUsed) return;
    if (equippedItem === QUILL_ITEM.id) {
      setIsQuillUsed(true);
      removeItem(QUILL_ITEM.id);
      setEquippedItem(null);
      showNotification("The quill hums with power. You may now inscribe your answer.");
    } else {
      showNotification("You need the Archivist's Quill to write here.");
    }
  };

  // ── Submit answer ──
  // ── Submit answer ──
  const handleSubmit = useCallback(() => {
    const isEncode = currentPuzzle.type === "morse-encode";
    const trimmed = isEncode
      ? input.trim().replace(/\s+/g, " ")
      : input.trim().toUpperCase();

    if (trimmed === currentPuzzle.answer) {
      setSuccessFlash(true);
      setHint(null);
      setTimeout(() => {
        setSuccessFlash(false);
        if (puzzleIndex + 1 < PUZZLES.length) {
          setPuzzleIndex((i) => i + 1);
          setInput("");
          
        } else {
          const savedLevel = parseInt(localStorage.getItem("escapeRoomCompletedLevel") || "0", 10);
          if (savedLevel < 4) localStorage.setItem("escapeRoomCompletedLevel", "4");
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

  // ── AI Hint ──
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
      setHint(data.hint ?? "Study the signs carefully. Not all is as it seems.");
    } catch {
      setHint("The spirits of the crypt remain silent for now. Try again later.");
    } finally {
      setHintLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;900&family=Crimson+Pro:ital,wght@0,300;0,400;1,300&display=swap" />
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --bg: #0a0705; --stone: #1a1510; --border: #3d2f1e;
          --gold: #c9a84c; --gold-dim: #7a5e28; --rust: #8b3a2a;
          --green: #4a7c59; --text: #d4c4a8; --muted: #6b5a44;
          --glow: 0 0 18px rgba(201,168,76,0.35);
        }
        body { background: var(--bg); }
        .crypt-root {
          min-height: 100vh; background: var(--bg);
          background-image: url('/images/level4_background.png');
          /* Asigură-te că imaginea acoperă tot ecranul și este centrată */
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          
          /* Opțional: fixarea fundalului la scroll pentru un efect mai profesional */
          background-attachment: fixed;
          font-family: 'Crimson Pro', serif; color: var(--text);
          display: flex; flex-direction: column; align-items: center;
          padding: 2rem 1rem 4rem; position: relative; overflow-x: hidden;
        }
        .header { text-align: center; margin-bottom: 2rem; }
        .level-badge { font-family: 'Cinzel', serif; font-size: 20px; letter-spacing: 0.3em; color: var(--gold-dim); text-transform: uppercase; margin-bottom: 0.6rem; }
        .level-title { font-family: 'Cinzel', serif; font-size: clamp(1.8rem, 5vw, 3rem); font-weight: 900; color: var(--gold); text-shadow: var(--glow); line-height: 1.1; letter-spacing: 0.05em; }
        .level-subtitle { font-size: 1rem; font-style: italic; color:; margin-top: 15px; font-weight: 300;}
        .divider { width: 200px; height: 1px; background: linear-gradient(90deg, transparent, var(--gold-dim), transparent); margin: 1rem auto 0; }
        .card { background: var(--stone); border: 1px solid var(--border); border-radius: 4px; padding: 2.5rem 2rem; max-width: 680px; width: 100%; position: relative; box-shadow: 0 8px 40px rgba(0,0,0,0.6); }
        .card-title { font-family: 'Cinzel', serif; font-size: 1.1rem; color: var(--gold); letter-spacing: 0.1em; margin-bottom: 1rem; }
        .card-body { font-size: 1.05rem; line-height: 1.8; color: var(--text); font-weight: 300; }
        .btn { display: inline-flex; align-items: center; gap: 0.5rem; margin-top: 1.8rem; padding: 0.75rem 2rem; background: transparent; border: 1px solid var(--gold-dim); color: var(--gold); font-family: 'Cinzel', serif; font-size: 0.8rem; letter-spacing: 0.2em; cursor: pointer; transition: all 0.2s; border-radius: 2px; }
        .btn:hover { background: rgba(201,168,76,0.08); border-color: var(--gold); box-shadow: var(--glow); }
        .puzzle-wrap { width: 100%; max-width: 1100px; display: flex; flex-direction: column; gap: 1.5rem; }
        .progress-row { display: flex; gap: 0.5rem; justify-content: center; }
        .pip { width: 32px; height: 4px; border-radius: 2px; background: var(--border); transition: background 0.4s; }
        .pip.done { background: var(--gold); }
        .pip.active { background: var(--gold-dim); }
        .puzzle-columns { display: flex; gap: 1.8rem; align-items: flex-start; }
        @media (max-width: 768px) { .puzzle-columns { flex-direction: column; } .parchment-col, .morsemap-col { width: 100% !important; } }
        .parchment-col {
          width: 65%; position: relative;
          background: #1a140a;
          background-image: linear-gradient(135deg, #1e1608 25%, #15100a 75%);
          border-radius: 3px; padding: 2.5rem 2.2rem; transform: rotate(-0.6deg);
          box-shadow: 0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(90,70,40,0.3);
        }
        
        .parchment-col {
          width: 65%; position: relative;
          
          /* --- MODIFICĂRILE PENTRU IMAGINEA DE FUNDAL --- */
          /* Ștergem fundalul vechi solid/gradient */
          background: none; 
          
          /* Adăugăm imaginea */
          background-image: url('/images/pergament.png');
          background-image: opacity 0.4;

          /* Asigurăm că imaginea acoperă tot div-ul fără să se repete și e centrată */
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          /* ------------------------------------------- */

          border-radius: 3px; 
          padding: 2.5rem 2.2rem; 
          transform: rotate(-0.6deg);
          
          /* Păstrăm umbrele pentru efectul de adâncime */
          box-shadow: 0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(90,70,40,0.3);
        }
          /* Modificăm textul general din pergament să fie închis la culoare */
        .parchment-col .card-body { 
          font-size: 1.05rem; 
          line-height: 1.85; 
          color: #ffffff; /* Un crem deschis */
          font-weight: 400; /* Poate puțin mai gros ca să se citească mai bine */
        }

        /* Modificăm și titlul din interiorul pergamentului */
        .parchment-col .card-title { 
          font-family: 'Cinzel', serif; 
          font-size: 1.15rem; 
          color: #f5e8d0; 
          letter-spacing: 0.1em; 
          margin-bottom: 1rem; 
        }
        
        /* Dacă ai text în zona de input (placeholder), modifică-l și pe acela */
        .decode-input::placeholder { 
          color: rgba(42, 26, 8, 0.6); /* Maro închis transparent */
        }
        
        .decode-input {
          /* ... restul stilurilor ... */
          color: #2a1a08; /* Textul scris de jucător să fie maro închis */
          border-color: rgba(90, 70, 40, 0.5);
        }
        .morse-display { background: rgba(6,4,2,0.55); border: 1px solid rgba(185, 180, 173, 0.5); border-left: 3px solid var(--rust); border-radius: 2px; padding: 1.2rem 1.4rem; font-family: 'Courier New', monospace; font-size: clamp(0.95rem, 2.5vw, 1.25rem); color: #e8d8a0; letter-spacing: 0.15em; word-break: break-all; line-height: 2; text-shadow: 0 0 8px rgba(232,216,160,0.4); }
        .morse-label { font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.25em; color: white; text-transform: uppercase; margin-bottom: 0.5rem; }
        .input-row { display: flex; gap: 0.75rem; }
        .decode-input { flex: 1; background: rgba(10,7,4,0.5); border: 1px solid rgba(61,47,30,0.6); border-radius: 2px; padding: 0.8rem 1.2rem; color: #e5dcc8; font-family: 'Cinzel', serif; font-size: 1rem; letter-spacing: 0.15em; text-transform: uppercase; outline: none; transition: border-color 0.2s; }
        .decode-input:focus { border-color: var(--gold-dim); box-shadow: 0 0 0 2px rgba(201,168,76,0.15); }
        .decode-input::placeholder { color: rgba(140,122,107,0.7); font-size: 0.85rem; }
        .btn-submit { padding: 0.8rem 1.6rem; background: var(--rust); border: none; color: #f5e8d0; font-family: 'Cinzel', serif; font-size: 0.75rem; letter-spacing: 0.2em; cursor: pointer; border-radius: 2px; transition: background 0.2s; }
        .btn-submit:hover { background: #a3452f; }
        @keyframes shake { 0%,100% { transform: rotate(-0.6deg) translateX(0); } 20% { transform: rotate(-0.6deg) translateX(-8px); } 40% { transform: rotate(-0.6deg) translateX(8px); } 60% { transform: rotate(-0.6deg) translateX(-5px); } 80% { transform: rotate(-0.6deg) translateX(5px); } }
        .parchment-col.shake { animation: shake 0.45s ease; }
        @keyframes flashGold { 0% { box-shadow: 0 8px 40px rgba(0,0,0,0.7); } 50% { box-shadow: 0 0 50px rgba(201,168,76,0.5); } 100% { box-shadow: 0 8px 40px rgba(0,0,0,0.7); } }
        .parchment-col.flash-success { animation: flashGold 1.8s ease; }
        .hint-section { border-top: 1px solid rgba(61,47,30,0.4); padding-top: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .hint-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
        .btn-hint { padding: 0.55rem 1.2rem; background: transparent; border: 1px solid rgba(90, 70, 40, 1); color: #537ab4ff; font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 0.2em; cursor: pointer; border-radius: 2px; transition: all 0.2s; white-space: nowrap; }
        .btn-hint:hover:not(:disabled) { background: rgba(74,124,89,0.12); }
        .btn-hint:disabled { opacity: 0.35; cursor: not-allowed; }
        .cooldown-text { font-size: 0.8rem; color: rgba(140,122,107,0.7); font-style: italic; }
        .hint-bubble { background: rgba(74,124,89,0.1); border: 1px solid rgba(74,124,89,0.3); border-radius: 2px; padding: 0.9rem 1.1rem; font-size: 0.95rem; font-style: italic; color: #9dcaab; line-height: 1.7; }
        .hint-loading { display: flex; align-items: center; gap: 0.6rem; color: rgba(140,122,107,0.7); font-size: 0.9rem; font-style: italic; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .dot-pulse span { animation: pulse 1.2s ease infinite; display: inline-block; }
        .dot-pulse span:nth-child(2) { animation-delay: 0.2s; }
        .dot-pulse span:nth-child(3) { animation-delay: 0.4s; }
        .morsemap-col { width: 35%; background: #1a150e; border: 1px solid var(--border); border-radius: 3px; padding: 1.5rem 1.2rem; position: relative; transform: rotate(0.8deg); box-shadow: 0 6px 30px rgba(0,0,0,0.6); }
        .morsemap-col::before { content: ''; position: absolute; top: 8px; left: 50%; transform: translateX(-50%); width: 14px; height: 14px; background: #8b7355; border-radius: 50%; box-shadow: inset 0 1px 2px rgba(0,0,0,0.5); z-index: 2; }
        .morsemap-title { font-family: 'Cinzel', serif; font-size: 0.85rem; color: var(--gold); letter-spacing: 0.2em; text-transform: uppercase; text-align: center; margin-bottom: 1rem; padding-top: 0.8rem; text-shadow: var(--glow); }
        .morsemap-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.25rem 0.8rem; font-family: 'Courier New', monospace; font-size: 0.78rem; }
        .morsemap-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.2rem 0; border-bottom: 1px solid rgba(61,47,30,0.2); }
        .morsemap-letter { color: var(--gold-dim); font-weight: bold; width: 18px; font-family: 'Cinzel', serif; font-size: 0.75rem; }
        .morsemap-arrow { color: var(--muted); font-size: 0.6rem; }
        .morsemap-code { color: #b19477ff; font-size: 14px;  letter-spacing: 0.1em; }
        .sealed-area { background: #060402; border: 2px dashed rgba(61,47,30,0.6); border-radius: 4px; padding: 2.5rem 1.8rem; text-align: center; cursor: pointer; transition: border-color 0.3s, background 0.3s; }
        .sealed-area:hover { border-color: var(--rust); background: rgba(139,58,42,0.05); }
        .sealed-text { font-family: 'Cinzel', serif; font-size: 0.78rem; letter-spacing: 0.15em; color: var(--muted); text-transform: uppercase; }
        .sealed-hint { font-size: 0.75rem; font-style: italic; color: var(--muted); margin-top: 0.5rem; opacity: 0.7; }
        .write-area { margin-top: 1.2rem; padding: 0.8rem 1.2rem; background: rgba(6,4,2,0.4); border: 2px dashed rgba(61,47,30,0.5); border-radius: 2px; text-align: center; cursor: pointer; transition: border-color 0.3s, background 0.3s; }
        .write-area:hover { border-color: var(--gold-dim); background: rgba(201,168,76,0.03); }
        .write-area-text { font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 0.15em; color: rgba(140,122,107,0.7); text-transform: uppercase; }
        .complete-wrap { text-align: center; max-width: 540px; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .complete-wrap { animation: fadeInUp 0.7s ease; }
        .complete-icon { font-size: 3rem; margin-bottom: 1rem; filter: drop-shadow(0 0 12px rgba(201,168,76,0.6)); }
        .complete-title { font-family: 'Cinzel', serif; font-size: 2rem; color: var(--gold); text-shadow: var(--glow); margin-bottom: 0.75rem; }
        .complete-body { font-size: 1.05rem; line-height: 1.8; color: var(--text); font-style: italic; margin-bottom: 2rem; }
      `}</style>

      <div className="crypt-root">

        {/* ── Timer (same as level3) ── */}
        {stage !== "complete" && !isGameOver && <Timer timeLeft={timeLeft} />}

        {/* ── Header ── */}
        <header className="header">
          <p className="level-badge">Level IV · Escape Room</p>
          <h1 className="level-title">The Crypt of Codes</h1>
          <p className="level-subtitle">
            &ldquo;Light does not reach this place. Only the mind can pierce the darkness.&rdquo;
          </p>
          <div className="divider" />
        </header>

        {/* ══ INTRO ══ */}
        {stage === "intro" && (
          <div className="card">
            <p className="card-title">⚰ Welcome to the Crypt</p>
            <p className="card-body">
              The Archivist has concealed messages encrypted in Morse code — a language
              of dots and dashes. Somewhere in this crypt you will find the tools you need.
              <br /><br />
              <strong style={{ color: "var(--gold-dim)" }}>Rule:</strong>{" "}
              <code style={{ fontFamily: "Courier New" }}>·</code> = dot,{" "}
              <code style={{ fontFamily: "Courier New" }}>-</code> = dash,{" "}
              space = letter separator,{" "}
              <code style={{ fontFamily: "Courier New" }}>/</code> = word separator.
            </p>
            <button className="btn" onClick={() => setStage("puzzle")}>
              ▶ &nbsp; ENTER THE CRYPT
            </button>
          </div>
        )}

        {/* ══ PUZZLE ══ */}
        {stage === "puzzle" && (
          <div className="puzzle-wrap">
            <div className="progress-row">
              {PUZZLES.map((p, i) => (
                <div key={p.id} className={`pip ${i < puzzleIndex ? "done" : i === puzzleIndex ? "active" : ""}`} />
              ))}
            </div>

            <div className="puzzle-columns">
              {/* ── LEFT: Parchment ── */}
              <div className={`parchment-col ${shake ? "shake" : ""} ${successFlash ? "flash-success" : ""}`}>
                <p className="card-title">
                  Puzzle {currentPuzzle.id} — {currentPuzzle.title}
                </p>

                {/* SEALED — click with scissors to unseal */}
                {!isParchmentUnsealed ? (
                  <div className="sealed-area" onClick={handleParchmentClick}>
                    <p style={{ fontSize: "2.5rem", marginBottom: "0.8rem" }}>📜</p>
                    <p className="sealed-text">Sealed Parchment</p>
                    <p className="sealed-hint">
                      {equippedItem === SCISSORS_ITEM.id
                        ? "Click here to cut the seal"
                        : "Find the Scissors and use them here to unseal it"}
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="card-body" style={{ marginBottom: "1.5rem" }}>
                      {currentPuzzle.flavor}
                    </p>
                    <div>
                      <p className="morse-label">
                        {currentPuzzle.type === "morse-encode" ? "▸ The Riddle" : "▸ Morse-Encoded Message"}
                      </p>
                      <div className="morse-display">{currentPuzzle.encoded}</div>
                      {currentPuzzle.type === "morse-encode" && (
                        <p style={{ marginTop: "0.6rem", fontSize: "0.82rem", fontStyle: "italic", color: "rgba(140,122,107,0.8)" }}>
                          Type your answer as Morse code (dots · and dashes -)
                        </p>
                      )}
                    </div>
                  </>
                )}

                {/* INPUT AREA — locked until quill is used */}
                {isParchmentUnsealed && (
                  isQuillUsed ? (
                    <div className="input-row" style={{ marginTop: "1.2rem" }}>
                      <input
                        className="decode-input"
                        style={currentPuzzle.type === "morse-encode" ? { textTransform: "none" } : undefined}
                        placeholder={currentPuzzle.type === "morse-encode" ? "e.g. .... . .-.. .-.. ---" : "Enter the decoded answer..."}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKey}
                        autoFocus
                        autoComplete="off"
                      />
                      <button className="btn-submit" onClick={handleSubmit}>SUBMIT</button>
                    </div>
                  ) : (
                    <div className="write-area" onClick={handleInputAreaClick}>
                      <p className="write-area-text">
                        {equippedItem === QUILL_ITEM.id
                          ? "Click here to inscribe your answer"
                          : "Find the Quill and use it here to inscribe your answer"}
                      </p>
                    </div>
                  )
                )}

                {/* HINT */}
                <div className="hint-section" style={{ marginTop: "1.5rem" }}>
                  <div className="hint-row">
                    <button className="btn-hint" onClick={handleHint} disabled={cooldown > 0 || hintLoading}>
                      🕯 REQUEST HINT (AI)
                    </button>
                    {cooldown > 0 && <span className="cooldown-text">The spirits are resting... {cooldown}s</span>}
                  </div>
                  {hintLoading && (
                    <div className="hint-loading">
                      <span className="dot-pulse"><span>·</span><span>·</span><span>·</span></span>
                      The spirits are consulting the archives
                    </div>
                  )}
                  {hint && !hintLoading && <div className="hint-bubble">🗝 {hint}</div>}
                </div>
              </div>

              {/* ── RIGHT: Morse Map ── */}
              <div className="morsemap-col">
                <p className="morsemap-title">Morse Code Key</p>
                <div className="morsemap-grid">
                  {Object.entries(MORSE_MAP)
                    .filter(([k]) => isNaN(Number(k)))
                    .map(([letter, code]) => (
                      <div className="morsemap-row" key={letter}>
                        <span className="morsemap-letter">{letter}</span>
                        <span className="morsemap-arrow"> </span>
                        <span className="morsemap-code">{code}</span>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ COMPLETE ══ */}
        {stage === "complete" && (
          <div className="complete-wrap">
            <div className="complete-icon">🏛</div>
            <h2 className="complete-title">The Crypt Is Unsealed!</h2>
            <p className="complete-body">
              You have deciphered all of the Archivist&apos;s messages. Knowledge is
              the mightiest key — and you have proven your mastery of it.
            </p>
            <button className="btn" onClick={() => router.push("/level5")}>
              ▶ &nbsp; NEXT LEVEL
            </button>
          </div>
        )}

        {/* ══ GAME OVER ══ */}
        {isGameOver && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(80,0,0,0.85)", backdropFilter: "blur(12px)" }}>
            <div style={{ padding: "3rem", border: "2px solid #991b1b", background: "rgba(0,0,0,0.9)", textAlign: "center", borderRadius: "4px", maxWidth: "32rem" }}>
              <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: "3.5rem", color: "#ef4444", marginBottom: "1.5rem" }}>Time&apos;s Up</h1>
              <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: "1.3rem", color: "#fca5a5", lineHeight: 1.7, marginBottom: "2rem" }}>
                The countdown has reached zero. The crypt seals shut forever.
              </p>
              <button className="btn" style={{ borderColor: "#991b1b", color: "#ef4444" }}
                onClick={() => { localStorage.removeItem("escapeRoomEndTime"); localStorage.removeItem("escapeRoomCompletedLevel"); router.push("/"); }}>
                ↺ RESTART
              </button>
            </div>
          </div>
        )}

        {/* ══ NOTIFICATION ══ */}
        {notification && (
          <div style={{ position: "fixed", bottom: "3rem", left: "50%", transform: "translateX(-50%)", zIndex: 80, background: "rgba(10,7,5,0.95)", border: "1px solid var(--gold-dim)", padding: "1rem 2rem", borderRadius: "4px", pointerEvents: "none", maxWidth: "36rem" }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: "0.9rem", color: "#e5d8b3", letterSpacing: "0.1em", textAlign: "center" }}>{notification}</p>
          </div>
        )}

        {/* ══ EQUIPPED HUD (same as level3) ══ */}
        {equippedItem && (
          <div style={{ position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)", zIndex: 70, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", border: "1px solid rgba(201,168,76,0.5)", padding: "0.5rem 1.5rem", borderRadius: "9999px", display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: "0.65rem", color: "#a89f91", letterSpacing: "0.2em", textTransform: "uppercase" }}>Equipped:</span>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: "0.8rem", fontWeight: "bold", color: "#e5d8b3", textTransform: "uppercase" }}>
              {items.find((i) => i.id === equippedItem)?.name}
            </span>
          </div>
        )}
      </div>

        {/* ══ CollectibleItem icons pe ecran — exact ca level3 ══ */}

      {/* Scissors — vizibil pe ecran cât timp pergamentul e sigilat și nu sunt în inventar */}
      {showScissorsOnScreen && (
        <div className="fixed bottom-24 right-16 z-[100]">
          <CollectibleItem
            item={SCISSORS_ITEM}
          />
        </div>
      )}

      {showQuillOnScreen && (
        <div 
          style={{ position: 'fixed', bottom: '70%', left: '3%', zIndex: 100 }}
        >
          <CollectibleItem item={QUILL_ITEM} />
        </div>
      )}
  </>
  );
}