"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useInventory } from "@/lib/InventoryContext";
import CollectibleItem from "@/components/CollectibleItem";
import { InspectionNarrator } from "@/components/InspectionNarrator";
import { RoleBlockedNotice, useRoleAccess } from "@/components/RoleGate";
import confetti from "canvas-confetti";

const RELIC_LION = { id: "relic_lion", name: "Stone Lion", description: "The oldest relic stone, badly eroded around the lion seal.", iconSrc: "/images/relic_lion_aged_cutout.png" };
const RELIC_CROSS = { id: "relic_cross", name: "Stone Cross", description: "An old cracked relic stone marked with a cross.", iconSrc: "/images/relic_cross_aged_cutout.png" };
const RELIC_EAGLE = { id: "relic_eagle", name: "Stone Eagle", description: "A worn relic stone marked with an eagle.", iconSrc: "/images/relic_eagle_aged_cutout.png" };
const RELIC_CROWN = { id: "relic_crown", name: "Stone Crown", description: "The newest relic stone, still sharply marked with a crown.", iconSrc: "/images/relic_crown_aged_cutout.png" };
const RELICS = [RELIC_LION, RELIC_CROSS, RELIC_EAGLE, RELIC_CROWN];
const CHEST_RELICS = [
  { item: RELIC_LION, className: "left-[33%] top-[49%]" },
  { item: RELIC_CROSS, className: "left-[45%] top-[54%]" },
  { item: RELIC_EAGLE, className: "left-[57%] top-[49%]" },
  { item: RELIC_CROWN, className: "left-[69%] top-[54%]" },
];
const ALTAR_SLOTS = [
  { className: "left-[34.4%] top-[31.2%]" },
  { className: "left-[40.4%] top-[44.4%]" },
  { className: "left-[56.3%] top-[45.1%]" },
  { className: "left-[69.6%] top-[31.6%]" },
];

const SPONGE_ITEM = { id: "level5_sponge", name: "Ancient Sponge", description: "A brittle natural sponge darkened by years of dust.", iconSrc: "/images/level5_sponge_antique_cutout.png" };
const LEVEL5_ITEM_IDS = [SPONGE_ITEM.id, ...RELICS.map(item => item.id)];

const GAME_DURATION = 30 * 60;
const RING_STEP = 30;
const RING_TARGETS = [0, 180, 0];
const RING_LAYERS = [
  { name: "Zodiac ring", shortName: "Zodiac", symbol: "SCORPIO", targetText: "The stinger guards the northern gate.", innerRadius: 34, clipRadius: 44, opacity: 0.98 },
  { name: "Omen ring", shortName: "Omen", symbol: "SUN", targetText: "The bright eye sinks where six shadows gather.", innerRadius: 22, clipRadius: 31, opacity: 1 },
  { name: "Hour ring", shortName: "Hour", symbol: "XII", targetText: "The first hour must look back at itself.", innerRadius: 12, clipRadius: 21, opacity: 1 },
];
const RING_HIT_BOUNDS = RING_LAYERS.map(ring => ({
  inner: ring.innerRadius * 2,
  outer: ring.clipRadius * 2,
}));

const getRandomRingRotations = () =>
  RING_TARGETS.map(target => {
    const choices = Array.from({ length: 12 }, (_, index) => index * RING_STEP)
      .filter(rotation => rotation !== target);
    return choices[Math.floor(Math.random() * choices.length)];
  });

const BackButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className="absolute bottom-8 left-1/2 z-[220] flex -translate-x-1/2 items-center gap-3 rounded-full border border-amber-200/25 bg-black/55 px-8 py-3 text-sm uppercase tracking-[0.28em] text-amber-100/80 backdrop-blur-md transition-all hover:border-amber-200/50 hover:bg-black/75 hover:text-amber-100"
    aria-label="Back"
  >
    <span className="text-2xl leading-none" aria-hidden="true">←</span>
    Back
  </button>
);

const FullscreenSceneImage = ({ src }: { src: string }) => (
  <>
    <img src={src} className="level5-scene-backdrop absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.38] saturate-[0.82] select-none pointer-events-none" alt="" />
    <img src={src} className="level5-scene-image absolute inset-0 h-full w-full object-contain brightness-[0.88] contrast-[1.08] saturate-[0.9] select-none pointer-events-none" alt="" />
  </>
);

const SceneFrame = ({ children, tone = "amber" }: { children: React.ReactNode; tone?: "amber" | "stone" }) => (
  <div className="level5-scene-frame absolute inset-0 overflow-hidden bg-black">
    <div className={`absolute inset-0 pointer-events-none ${tone === "amber" ? "bg-[radial-gradient(circle_at_50%_38%,rgba(204,154,63,0.18),transparent_34%),linear-gradient(180deg,rgba(0,0,0,0.22),rgba(0,0,0,0.78))]" : "bg-[radial-gradient(circle_at_50%_42%,rgba(168,125,65,0.12),transparent_38%),linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.82))]"}`} />
    <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_180px_rgba(0,0,0,0.92),inset_0_0_28px_rgba(212,175,55,0.12)]" />
    <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/85 to-transparent pointer-events-none" />
    {children}
  </div>
);

const SceneLabel = ({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) => (
  <div className="level5-scene-label pointer-events-none absolute left-8 top-8 z-[80] max-w-sm">
    <div className="mb-3 flex items-center gap-3">
      <div className="h-px w-14 bg-gradient-to-r from-[#d4af37] to-transparent" />
      <span className="font-cinzel text-[10px] uppercase tracking-[0.42em] text-[#d4af37]/70">{eyebrow}</span>
    </div>
    <h1 className="font-cinzel text-2xl uppercase tracking-[0.18em] text-[#f1dfb8] drop-shadow-[0_0_18px_rgba(212,175,55,0.28)]">{title}</h1>
    {hint && <p className="mt-3 font-serif text-sm italic leading-relaxed text-[#c8bda8]/75">{hint}</p>}
  </div>
);

const Hotspot = ({ className, label, onClick }: { className: string; label: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`level5-hotspot group absolute z-30 cursor-pointer rounded-[2rem] outline-none transition-all duration-300 ${className}`}
    aria-label={label}
    title={label}
  >
    <span className="level5-hotspot-glow absolute inset-0 rounded-[2rem] border border-amber-200/0 bg-amber-100/[0.01] transition-all duration-300 group-hover:border-amber-200/35 group-hover:bg-amber-200/[0.045] group-hover:shadow-[0_0_34px_rgba(212,175,55,0.18),inset_0_0_28px_rgba(255,235,174,0.08)]" />
    <span className="level5-hotspot-dot absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/0 transition-all duration-300 group-hover:bg-amber-200/80 group-hover:shadow-[0_0_20px_rgba(251,191,36,0.85)]" />
    <span className="level5-hotspot-label absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[130%] whitespace-nowrap rounded-full border border-[#5c4026]/70 bg-black/70 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-amber-100/0 backdrop-blur transition-all duration-300 group-hover:text-amber-100/90">
      {label}
    </span>
  </button>
);

const LeverGlyph = ({ state }: { state: "u" | "d" }) => (
  <div className="relative flex h-24 w-16 items-center justify-center">
    <div className="absolute inset-x-5 top-0 bottom-0 rounded-full bg-stone-950/55 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]" />
    <div className={`relative h-14 w-3 rounded-full bg-[#2b2117] shadow-[inset_0_0_0_1px_rgba(245,222,160,0.12),0_8px_18px_rgba(0,0,0,0.45)] ${state === "u" ? "-translate-y-4" : "translate-y-4"}`} />
    <div className={`absolute h-5 w-10 rounded-full border border-amber-200/20 bg-[#6b4521] shadow-[0_0_12px_rgba(212,175,55,0.12)] ${state === "u" ? "top-3" : "bottom-3"}`} />
  </div>
);

const PlayableLever = ({ state, index, onToggle }: { state: "u" | "d"; index: number; onToggle: () => void }) => (
  <button
    onClick={onToggle}
    className={`level5-play-lever level5-play-lever-${index + 1} ${state === "u" ? "is-up" : "is-down"}`}
    aria-label={`Toggle lever ${index + 1}`}
  >
    <span className="level5-lever-slot" />
    <span className="level5-lever-arm" />
    <span className="level5-lever-knob" />
    <span className="level5-lever-number">{index + 1}</span>
  </button>
);

const LEVER_WALL_CLUES: { lever: string; state: "u" | "d"; position: string }[] = [
  { lever: "II", state: "u", position: "left" },
  { lever: "III", state: "d", position: "center" },
  { lever: "I", state: "d", position: "right" },
];

const AltarImageOverlay = ({ children }: { children: React.ReactNode }) => (
  <div className="absolute inset-0 flex items-center justify-center">
    <div
      className="relative max-h-full"
      style={{
        width: "min(100vw, calc(100vh * 1695 / 928))",
        aspectRatio: "1695 / 928",
      }}
    >
      {children}
    </div>
  </div>
);

type VictoryStats = {
  elapsedSeconds: number;
  remainingSeconds: number;
  score: number;
};

export default function Level5Page() {
  const router = useRouter();
  const { items, isLoaded: isInventoryLoaded, addItem, removeItem, equippedItem, setEquippedItem } = useInventory();
  const { isArtisan, isScribe } = useRoleAccess();
  const initialRingRotations = useRef(getRandomRingRotations());

  // Scene state
  const [view, setView] = useState<"main" | "levers" | "lever_clue" | "altar" | "chest_full" | "chest_dial">("main");
  const [leverPositions, setLeverPositions] = useState<("u" | "d")[]>(["u", "u", "u"]);
  const [leversSolved, setLeversSolved] = useState(false);
  const [showNote, setShowNote] = useState(false);
  
  // Rotation Puzzle State
  const [ringRotations, setRingRotations] = useState<number[]>(initialRingRotations.current);
  const [chestOpen, setChestOpen] = useState(false);
  
  const [altarSlots, setAltarSlots] = useState<(string | null)[]>([null, null, null, null]);
  const [doorOpen, setDoorOpen] = useState(false);
  const [victoryStats, setVictoryStats] = useState<VictoryStats | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const dialRef = useRef<HTMLDivElement>(null);
  const hasClearedStaleLevel5State = useRef(false);

  useEffect(() => {
    if (!isInventoryLoaded) return;
    if (hasClearedStaleLevel5State.current) return;
    hasClearedStaleLevel5State.current = true;

    [
      "escapeRoomLevel5LeverPositions",
      "escapeRoomLevel5LeversSolved",
      "escapeRoomLevel5RingRotations",
      "escapeRoomLevel5ChestOpen",
      "escapeRoomLevel5AltarSlots",
      "escapeRoomLevel5DoorOpen",
    ].forEach(key => localStorage.removeItem(key));

    items.forEach(item => {
      removeItem(item.id);
    });

    if (equippedItem) {
      setEquippedItem(null);
    }
  }, [equippedItem, isInventoryLoaded, items, removeItem, setEquippedItem]);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isGameOver, setIsGameOver] = useState(false);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const formatTime = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60);
    const rest = safeSeconds % 60;
    return `${minutes}:${rest.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (victoryStats) return;
      const endTimeStr = localStorage.getItem("escapeRoomEndTime");
      if (!endTimeStr) return;
      const remaining = Math.max(0, Math.floor((parseInt(endTimeStr, 10) - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining <= 0) {
        setIsGameOver(true);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [victoryStats]);

  const toggleLever = (index: number) => {
    if (leversSolved) return;
    setLeverPositions(prev => {
      const next = [...prev];
      next[index] = next[index] === "u" ? "d" : "u";
      return next;
    });
  };

  useEffect(() => {
    if (leversSolved) return;
    if (leverPositions[0] === "d" && leverPositions[1] === "u" && leverPositions[2] === "d") {
      setLeversSolved(true);
      showNotification("The stone mechanism unlocks.");
    }
  }, [leverPositions, leversSolved]);

  const handleDialClick = (e: React.MouseEvent) => {
    if (chestOpen || !dialRef.current) return;
    if (!isArtisan) {
      showNotification("Only the Artisan can rotate the rings.");
      return;
    }
    const rect = dialRef.current.getBoundingClientRect();
    const diameter = Math.min(rect.width, rect.height);
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));
    const relativeRadius = (distance / (diameter / 2)) * 100;

    const ringIdx = RING_HIT_BOUNDS.findIndex(
      bounds => relativeRadius >= bounds.inner && relativeRadius <= bounds.outer
    );

    if (ringIdx !== -1) {
      rotateRing(ringIdx);
    }
  };

  const rotateRing = (ringIdx: number) => {
    if (chestOpen) return;
    if (ringStatuses[ringIdx]) return;
    setRingRotations(prev => {
      const next = [...prev];
      next[ringIdx] = next[ringIdx] + RING_STEP;
      return next;
    });
  };

  useEffect(() => {
    const solved = ringRotations.length === RING_TARGETS.length &&
      RING_TARGETS.every((target, index) => (ringRotations[index] ?? 0) % 360 === target);
    if (solved) {
      setChestOpen(true);
      setView("chest_full");
      showNotification("The alignment is complete. The chest unseals.");
    }
  }, [ringRotations]);

  const collectChestRelic = (item: typeof RELIC_LION) => {
    addItem(item);
    showNotification(`${item.name} added to your inventory.`);
  };

  const handleAltarClick = (index: number) => {
    if (doorOpen) return;
    if (altarSlots[index]) {
      const itemId = altarSlots[index]!;
      const item = RELICS.find(i => i.id === itemId);
      if (item) addItem(item);
      setAltarSlots(prev => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
    } else if (equippedItem) {
        const relicIds = RELICS.map(item => item.id);
      if (relicIds.includes(equippedItem)) {
        setAltarSlots(prev => {
          const next = [...prev];
          next[index] = equippedItem;
          return next;
        });
        removeItem(equippedItem);
        setEquippedItem(null);
      }
    }
  };

  useEffect(() => {
    if (altarSlots[0] === RELIC_LION.id && altarSlots[1] === RELIC_CROSS.id &&
      altarSlots[2] === RELIC_EAGLE.id && altarSlots[3] === RELIC_CROWN.id) {
      setDoorOpen(true);
      showNotification("The heavy doors grind open.");
    }
  }, [altarSlots]);

  // Old approach disabled: previously this swapped full images like
  // `/images/levers_${leverPositions.join("")}.png` for every lever state.
  // The levers are now simple interactive overlays that move up/down on top of a static scene.
  const leverBaseImage = "/images/level5_levers_base.png";
  const currentRoomImage = leversSolved ? "/images/level5_main_room_bg.png" : "/images/level5_levers_room_bg.png";
  const ringStatuses = RING_TARGETS.map((target, index) =>
    ringRotations.length === RING_TARGETS.length && (ringRotations[index] ?? 0) % 360 === target
  );

  const completeEscapeRoom = () => {
    const remainingSeconds = Math.max(0, timeLeft);
    const elapsedSeconds = GAME_DURATION - remainingSeconds;
    const score = Math.max(100, 1000 + remainingSeconds * 2);
    const stats = { elapsedSeconds, remainingSeconds, score };

    localStorage.setItem("escapeRoomCompletedLevel", "5");
    localStorage.setItem("escapeRoomVictoryStats", JSON.stringify(stats));
    localStorage.removeItem("escapeRoomEndTime");
    setVictoryStats(stats);

    confetti({
      particleCount: 220,
      spread: 150,
      origin: { y: 0.55 },
      colors: ["#d4af37", "#ffffff", "#8b5e1a", "#f7e7a6"],
    });
  };

  const resetLevel5ForTesting = () => {
    setView("main");
    LEVEL5_ITEM_IDS.forEach(removeItem);
    if (equippedItem && LEVEL5_ITEM_IDS.includes(equippedItem)) {
      setEquippedItem(null);
    }
    setLeverPositions(["u", "u", "u"]);
    setLeversSolved(false);
    setRingRotations(getRandomRingRotations());
    setChestOpen(false);
    setAltarSlots([null, null, null, null]);
    setDoorOpen(false);
    setVictoryStats(null);
    [
      "escapeRoomLevel5LeverPositions",
      "escapeRoomLevel5LeversSolved",
      "escapeRoomLevel5RingRotations",
      "escapeRoomLevel5ChestOpen",
      "escapeRoomLevel5AltarSlots",
      "escapeRoomLevel5DoorOpen",
      "escapeRoomVictoryStats",
    ].forEach(key => localStorage.removeItem(key));
    showNotification("Level 5 reset for testing.");
  };

  if (victoryStats) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-black font-cinzel text-[#e5d8b3] flex items-center justify-center px-6">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-50"
          style={{ backgroundImage: "url('/images/level5_main_bg.jpg')" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.18),rgba(0,0,0,0.9)_65%)]" />

        <section className="relative z-10 w-full max-w-3xl text-center border-y border-[#d4af37]/50 py-12">
          <p className="text-[10px] md:text-xs tracking-[0.6em] uppercase text-[#d4af37]/70 mb-5">
            The Final Door Has Opened
          </p>
          <h1 className="text-4xl md:text-6xl text-[#d4af37] tracking-[0.16em] drop-shadow-[0_0_30px_rgba(212,175,55,0.45)]">
            You Escaped
          </h1>
          <p className="mt-6 font-serif text-lg md:text-xl italic text-[#cdbf9f] leading-relaxed">
            The last mechanism falls silent behind you. The room keeps its secrets, but it no longer keeps you.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="border border-[#5c4026] bg-black/60 px-6 py-5">
              <div className="text-[10px] tracking-[0.35em] uppercase text-[#8c7a6b]">Time</div>
              <div className="mt-3 text-3xl text-[#d4af37]">{formatTime(victoryStats.elapsedSeconds)}</div>
            </div>
            <div className="border border-[#5c4026] bg-black/60 px-6 py-5">
              <div className="text-[10px] tracking-[0.35em] uppercase text-[#8c7a6b]">Remaining</div>
              <div className="mt-3 text-3xl text-[#d4af37]">{formatTime(victoryStats.remainingSeconds)}</div>
            </div>
            <div className="border border-[#5c4026] bg-black/60 px-6 py-5">
              <div className="text-[10px] tracking-[0.35em] uppercase text-[#8c7a6b]">Score</div>
              <div className="mt-3 text-3xl text-[#d4af37]">{victoryStats.score}</div>
            </div>
          </div>

          <button
            onClick={() => router.push("/lobby")}
            className="mt-10 px-8 py-3 border border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black transition-colors uppercase tracking-[0.3em] text-xs"
          >
            Return to Lobby
          </button>
        </section>
      </main>
    );
  }

  if (isGameOver) {
    return (
      <main className="min-h-screen bg-black font-cinzel text-[#d4af37] flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-4xl tracking-[0.2em] mb-6">Time Has Run Out</h1>
        <p className="font-serif italic text-[#c7baaa] max-w-xl">
          The chamber seals itself again. Return to the lobby and begin another attempt.
        </p>
        <button
          onClick={() => router.push("/lobby?gameover=time")}
          className="mt-10 px-8 py-3 border border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black transition-colors uppercase tracking-[0.3em] text-xs"
        >
          Return to Lobby
        </button>
      </main>
    );
  }

  return (
    <div className="level5-root relative w-full h-screen bg-black overflow-hidden font-cinzel select-none">
      <div 
        className="level5-main-bg absolute inset-0 bg-cover bg-center transition-all duration-1000 brightness-[0.82] contrast-[1.08] saturate-[0.9]"
        style={{
          backgroundImage: `url('${currentRoomImage}')`,
          filter: (view !== "main" || showNote) ? "blur(15px) brightness(0.18)" : "none",
        }}
      />
      <div className="level5-main-vignette absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_44%,transparent_0%,rgba(0,0,0,0.24)_46%,rgba(0,0,0,0.72)_100%)]" />
      <div className="level5-main-topshade absolute inset-x-0 top-0 h-32 pointer-events-none bg-gradient-to-b from-black/70 to-transparent" />
      <div className="level5-main-bottomshade absolute inset-x-0 bottom-0 h-48 pointer-events-none bg-gradient-to-t from-black/80 to-transparent" />
      <InspectionNarrator
        objects={[
          { id: "final_chamber", label: "Final Chamber", level: 5, state: { leversSolved, chestOpen } },
          { id: "lever_mechanism", label: "Lever Mechanism", level: 5, state: { solved: leversSolved } },
          { id: "sealed_reliquary", label: "Sealed Reliquary", level: 5, state: { open: chestOpen } },
        ]}
      />

      {view === "main" && !showNote && (
        <>
          <SceneLabel
            eyebrow="Level V"
            title="The Final Chamber"
            hint="A sealed reliquary, an old altar, and a wall scarred by a forgotten mechanism."
          />
          <Hotspot
            onClick={() => setView(leversSolved ? "chest_full" : "levers")}
            className="level5-hotspot-levers left-[7%] top-[31%] h-[45%] w-[21%]"
            label={leversSolved ? "Inspect the reliquary" : "Inspect the levers"}
          />
          <Hotspot
            onClick={() => setView("altar")}
            className="level5-hotspot-altar right-[6%] bottom-[6%] h-[43%] w-[29%]"
            label="Approach the altar"
          />
          {isScribe && (
            <Hotspot
              onClick={() => setView("lever_clue")}
              className="level5-hotspot-tablet left-[72%] top-[16%] h-[29%] w-[17%]"
              label="Inspect the carved tablet"
            />
          )}
          {doorOpen && (
            <div className="absolute left-[40%] top-[27%] z-40 flex h-[52%] w-[20%] items-center justify-center">
              <button onClick={completeEscapeRoom} className="rounded-full border border-[#f6d77b]/60 bg-black/55 px-10 py-5 text-[#f6d77b] shadow-[0_0_80px_rgba(255,215,0,0.35),inset_0_0_24px_rgba(212,175,55,0.12)] backdrop-blur transition-all hover:bg-[#d4af37] hover:text-black tracking-[0.45em] animate-pulse">EXIT</button>
            </div>
          )}
          {!items.find(i => i.id === SPONGE_ITEM.id) && (
            <div className="level5-sponge-pickup absolute left-[45%] bottom-[5%] z-30 scale-75"><CollectibleItem item={SPONGE_ITEM} /></div>
          )}
        </>
      )}

      {showNote && (
        <div className="level5-note-overlay">
          <div className="level5-aged-parchment">
            <div className="level5-parchment-pin level5-parchment-pin-left" />
            <div className="level5-parchment-pin level5-parchment-pin-right" />
            <div className="level5-parchment-title">
              <div className="mx-auto mb-4 h-px w-40 bg-[#4a2b13]/45" />
              <h3>Wall Inscription</h3>
              <div className="mx-auto mt-4 h-px w-28 bg-[#4a2b13]/35" />
            </div>
            <p className="level5-parchment-poem">
              "Three circles guard the sleeping wood:<br /><br />
              Where midnight crowns the wheel, the hidden sting keeps watch.<br />
              The bright eye falls to the sixth shadow.<br />
              The first hour faces itself once more."
            </p>
            <button onClick={() => setShowNote(false)} className="level5-parchment-close">Close</button>
          </div>
        </div>
      )}

      {view === "levers" && (
        <div className="level5-modal-backdrop absolute inset-0 z-50 flex items-center justify-center bg-black/72 px-6 backdrop-blur-md">
          <section className="level5-lever-window relative h-[min(78vh,760px)] w-[min(1120px,94vw)] overflow-hidden rounded-[1.4rem] border border-[#d4af37]/28 bg-black shadow-[0_34px_120px_rgba(0,0,0,0.9),inset_0_0_0_1px_rgba(255,230,176,0.08)]">
            <FullscreenSceneImage src={leverBaseImage} />
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_40%,transparent_0%,rgba(0,0,0,0.12)_38%,rgba(0,0,0,0.62)_100%)]" />

            <div className="absolute left-6 top-6 z-[80] max-w-md">
              <p className="mb-2 text-[10px] uppercase tracking-[0.42em] text-[#d4af37]/70">Mechanism Alcove</p>
              <h2 className="text-2xl uppercase tracking-[0.18em] text-[#f1dfb8] drop-shadow-[0_0_18px_rgba(212,175,55,0.28)]">The Three Levers</h2>
              <p className="mt-2 font-serif text-sm italic leading-relaxed text-[#c8bda8]/75">
                The stone remembers a pattern. Toggle each iron handle into its carved fate.
              </p>
            </div>

            <button
              onClick={() => setView("main")}
              className="absolute right-5 top-5 z-[90] rounded-full border border-amber-200/30 bg-black/65 px-5 py-2 text-xs uppercase tracking-[0.24em] text-amber-100/80 backdrop-blur transition hover:border-amber-200/60 hover:text-amber-100"
              aria-label="Close lever window"
            >
              Close
            </button>

            <div className="level5-playable-levers">
              {leverPositions.map((position, i) => (
                <PlayableLever
                  key={i}
                  index={i}
                  state={position}
                  onToggle={() => isArtisan ? toggleLever(i) : showNotification("Only the Artisan can move the levers.")}
                />
              ))}
            </div>
            {!isArtisan && (
              <div className="absolute bottom-24 left-1/2 z-[90] w-[min(420px,80vw)] -translate-x-1/2">
                <RoleBlockedNotice role="artisan" label="Only the Artisan can move the levers." />
              </div>
            )}
          </section>
        </div>
      )}

      {view === "lever_clue" && (
        <SceneFrame tone="stone">
            <FullscreenSceneImage src="/images/level5_lever_clue_wall.png" />
            <SceneLabel eyebrow="Carved Tablet" title="A Mechanism Record" hint="A buried hand scratched the lever order directly into the wall." />
            <div className="level5-wall-carving pointer-events-none">
              {LEVER_WALL_CLUES.map(({ lever, state, position }) => (
                <div key={lever} className={`level5-wall-carving-panel level5-wall-carving-panel-${position}`}>
                  <span className="level5-wall-carving-roman">{lever}</span>
                  <span className={`level5-wall-carving-groove ${state === "u" ? "is-up" : "is-down"}`}>
                    <span className="level5-wall-carving-track" />
                    <span className="level5-wall-carving-handle" />
                  </span>
                  <span className="level5-wall-carving-word">{state === "u" ? "RAISE" : "LOWER"}</span>
                </div>
              ))}
              <div className="level5-wall-carving-verse">
                Edge stones fall. The center stone keeps its watch.
              </div>
            </div>
            <div className="level5-stone-poem-fragment">
              <div>Reliquary Order</div>
              <p>
                From the oldest stone to the newest,
                <br />
                set their fates in order.
                <br />
                The lion begins. The crown ends.
              </p>
            </div>
            <BackButton onClick={() => setView("main")} />
        </SceneFrame>
      )}

      {view === "altar" && (
        <SceneFrame>
            <FullscreenSceneImage src="/images/level5_altar_zoom_center_stone.png" />
            <SceneLabel eyebrow="Reliquary Altar" title="The Stone Offering" hint="The altar asks for age, order, and patience." />
            <AltarImageOverlay>
              <button
                onClick={() => setShowNote(true)}
                className="group absolute left-[6%] bottom-[24%] h-[20%] w-[36%] -rotate-2 cursor-pointer rounded-3xl outline-none"
                aria-label="Read the parchment on the altar"
                title="Read the parchment"
              >
                <span className="absolute inset-0 rounded-3xl border border-amber-200/0 transition-all group-hover:border-amber-200/25 group-hover:bg-amber-100/[0.035] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.16)]" />
              </button>
              {ALTAR_SLOTS.map((slot, i) => (
                <button
                  key={i}
                  onClick={() => handleAltarClick(i)}
                  className={`absolute flex aspect-square w-[8.5%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-stone-900/35 bg-black/20 shadow-[inset_0_0_18px_rgba(0,0,0,0.55)] transition-all hover:bg-amber-100/10 ${slot.className}`}
                  aria-label={`Altar stone slot ${i + 1}`}
                >
                  {altarSlots[i] && (
                    <img
                      src={RELICS.find(item => item.id === altarSlots[i])?.iconSrc}
                      className="h-[78%] w-[78%] object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.75)]"
                      alt="Relic"
                    />
                  )}
                </button>
              ))}
            </AltarImageOverlay>
            <BackButton onClick={() => setView("main")} />
        </SceneFrame>
      )}

      {/* STEP 1: FULL CHEST VIEW */}
      {view === "chest_full" && (
        <SceneFrame>
            <FullscreenSceneImage src={chestOpen ? "/images/level5_chest_open_empty.png" : "/images/level5_chest_zoom.png"} />
            <SceneLabel eyebrow="Sealed Reliquary" title={chestOpen ? "The Chest Is Open" : "The Sleeping Wood"} hint={chestOpen ? "The relics are waiting to be taken." : "The dial is the lock. The verse is the key."} />

            {!chestOpen ? (
              <button
                onClick={() => setView("chest_dial")}
                className="group absolute left-[41.5%] top-[3%] w-[49%] aspect-square rounded-full cursor-pointer outline-none"
                aria-label="Inspect the chest dial"
              >
                <span className="absolute inset-0 rounded-full border border-amber-200/0 transition-all group-hover:border-amber-200/30 group-hover:bg-amber-100/[0.03] group-hover:shadow-[0_0_42px_rgba(212,175,55,0.18),inset_0_0_30px_rgba(255,232,178,0.08)]" />
              </button>
            ) : (
              <div className="absolute inset-0">
                {CHEST_RELICS.map(({ item, className }) => (
                  !items.find(i => i.id === item.id) && (
                    <button
                      key={item.id}
                      onClick={() => collectChestRelic(item)}
                      className={`absolute h-[13%] w-[9%] -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform duration-300 hover:scale-110 ${className}`}
                      aria-label={`Collect ${item.name}`}
                      title={item.name}
                    >
                      <img
                        src={item.iconSrc}
                        alt=""
                        className="h-full w-full object-contain brightness-90 contrast-110 sepia-[0.12] drop-shadow-[0_10px_12px_rgba(0,0,0,0.9)]"
                      />
                    </button>
                  )
                ))}
              </div>
            )}

            <BackButton onClick={() => setView("main")} />
        </SceneFrame>
      )}

      {/* STEP 2: DIAL/RINGS VIEW */}
      {view === "chest_dial" && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/98">
          <div className="relative flex w-full flex-col items-center justify-center gap-6 px-8 lg:flex-row">
            {!chestOpen ? (
              <>
                <div
                  ref={dialRef}
                  onClick={handleDialClick}
                  className="relative h-[min(68vh,82vw,620px)] w-[min(68vh,82vw,620px)] shrink-0 rounded-full bg-stone-950 shadow-[0_0_120px_rgba(0,0,0,1)] select-none cursor-pointer"
                  aria-label="Rotating chest dial. Click an outer, middle, or inner ring to rotate it."
                >
                  <img src="/images/level5_chest_dial_v2.png" className="absolute inset-0 h-full w-full rounded-full object-cover select-none pointer-events-none opacity-80" />
                  {RING_LAYERS.map((ring, index) => (
                    <div
                      key={ring.name}
                      className="absolute inset-0 rounded-full overflow-hidden transition-transform duration-500 ease-out"
                      style={{
                        clipPath: `circle(${ring.clipRadius}% at 50% 50%)`,
                        opacity: ring.opacity,
                        transform: `rotate(${ringRotations[index] ?? 0}deg)`,
                        zIndex: index + 10,
                      }}
                    >
                      <img src="/images/level5_chest_dial_v2.png" className="h-full w-full rounded-full object-cover select-none pointer-events-none" />
                    </div>
                  ))}

                  <div className="absolute inset-[-2%] z-[45] rounded-full border-[12px] border-[#4a3219] opacity-80 shadow-[inset_0_0_22px_rgba(255,221,138,0.12),0_0_45px_rgba(0,0,0,0.85)] pointer-events-none" />
                  <div className="absolute left-1/2 top-[3%] z-[66] -translate-x-1/2 rounded-full border border-amber-200/40 bg-black/75 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-amber-100/85 pointer-events-none">XII</div>
                  <div className="absolute bottom-[3%] left-1/2 z-[66] -translate-x-1/2 rounded-full border border-stone-200/20 bg-black/65 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-stone-200/65 pointer-events-none">VI</div>
                  <div className="absolute inset-[14.5%] z-40 rounded-full border border-black/50 shadow-[0_0_0_1px_rgba(251,191,36,0.22),inset_0_0_18px_rgba(0,0,0,0.7)] pointer-events-none" />
                  <div className="absolute inset-[31.5%] z-40 rounded-full border border-black/55 shadow-[0_0_0_1px_rgba(251,191,36,0.2),inset_0_0_14px_rgba(0,0,0,0.75)] pointer-events-none" />
                  <div className="absolute inset-[3%] z-50 rounded-full border border-amber-200/40 pointer-events-none" />

                  <div className="absolute left-1/2 top-0 z-[65] h-[13%] w-1.5 -translate-x-1/2 bg-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.8)] pointer-events-none" />
                  <div className="absolute inset-[45%] z-[65] rounded-full border border-amber-200/80 bg-stone-950/70 shadow-[0_0_24px_rgba(251,191,36,0.35)] pointer-events-none" />
                </div>

                <aside className="w-[min(92vw,360px)] rounded-2xl border border-[#5c4026]/70 bg-black/60 p-6 text-[#e5d8b3] shadow-[0_22px_80px_rgba(0,0,0,0.75)] backdrop-blur-md">
                  <p className="mb-2 text-[10px] uppercase tracking-[0.35em] text-[#d4af37]/70">The Ring Verse</p>
                  <h3 className="text-lg uppercase tracking-[0.18em] text-[#f1dfb8]">Scorpio, Sun, Hour</h3>
                  <p className="mt-3 font-serif text-sm italic leading-relaxed text-[#c8bda8]/75">
                    Read the rings from outside to inside: creature, omen, hour. The carved rim is only a frame.
                  </p>
                  <div className="mt-5 rounded-xl border border-[#d4af37]/25 bg-[#1b1208]/70 px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] uppercase tracking-[0.24em] text-[#8c7a6b]">Verses fulfilled</span>
                      <span className="text-sm font-bold tracking-[0.18em] text-[#d4af37]">{ringStatuses.filter(Boolean).length}/3</span>
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      {ringStatuses.map((isAligned, index) => (
                        <div key={index} className={`h-1.5 rounded-full ${isAligned ? "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.65)]" : "bg-[#5c4026]"}`} />
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 space-y-3">
                    {RING_LAYERS.map((ring, index) => (
                      <div key={ring.name} className={`rounded-xl border px-4 py-3 ${ringStatuses[index] ? "border-emerald-400/45 bg-emerald-950/20" : "border-[#5c4026]/70 bg-black/35"}`}>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-xs uppercase tracking-[0.22em] text-amber-100/75">{ring.shortName}</span>
                          <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${ringStatuses[index] ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-950/35 text-amber-200/75"}`}>
                            {ringStatuses[index] ? "Resting" : "Wandering"}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="font-serif text-sm text-[#c8bda8]/80">
                            {ring.targetText}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isArtisan) {
                                rotateRing(index);
                              } else {
                                showNotification("Only the Artisan can rotate the rings.");
                              }
                            }}
                            className="rounded-full border border-[#d4af37]/35 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#d4af37] transition hover:border-[#d4af37] hover:bg-[#d4af37]/10 disabled:opacity-40"
                            disabled={ringStatuses[index] || !isArtisan}
                          >
                            Turn
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 border-t border-[#5c4026]/60 pt-4 font-serif text-xs italic leading-relaxed text-[#8c7a6b]">
                    Each verse names a sign and a place: the sting, the bright eye, and the hour that mirrors the top mark.
                  </p>
                </aside>
              </>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
                <p className="text-amber-500 text-sm tracking-widest uppercase mb-8">Mechanism Unlocked</p>
                <button onClick={() => setView("chest_full")} className="px-6 py-2 border border-amber-500/40 text-amber-500 text-xs hover:bg-amber-500/10 transition-all uppercase">Back to Chest</button>
              </div>
            )}
          </div>
          <BackButton onClick={() => setView("chest_full")} />
        </div>
      )}

      {notification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-stone-900/95 border border-amber-900/30 px-16 py-5 text-amber-500 text-[12px] tracking-[0.5em] uppercase z-[200] shadow-2xl">
          {notification}
        </div>
      )}

      <button
        onClick={resetLevel5ForTesting}
        className="absolute bottom-3 right-3 z-[240] rounded border border-[#5c4026]/70 bg-black/65 px-3 py-2 text-[9px] uppercase tracking-[0.18em] text-[#8c7a6b] opacity-55 transition hover:border-red-800 hover:text-red-300 hover:opacity-100"
        title="Reset Level 5 testing state"
      >
        Reset L5
      </button>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
        .level5-root {
          position: relative;
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background: #000;
          color: #e5d8b3;
          font-family: 'Cinzel', serif;
          user-select: none;
        }
        .level5-root button {
          font: inherit;
        }
        .level5-main-bg,
        .level5-scene-frame,
        .level5-scene-backdrop,
        .level5-scene-image {
          position: absolute;
          inset: 0;
        }
        .level5-main-bg {
          background-size: cover;
          background-position: center;
          transition: filter 900ms ease, opacity 900ms ease;
        }
        .level5-main-vignette,
        .level5-main-topshade,
        .level5-main-bottomshade {
          position: absolute;
          pointer-events: none !important;
          z-index: 1;
        }
        .level5-main-vignette {
          inset: 0;
          background: radial-gradient(circle at 50% 44%, transparent 0%, rgba(0,0,0,0.24) 46%, rgba(0,0,0,0.72) 100%);
        }
        .level5-main-topshade {
          left: 0;
          right: 0;
          top: 0;
          height: 8rem;
          background: linear-gradient(to bottom, rgba(0,0,0,0.7), transparent);
        }
        .level5-main-bottomshade {
          left: 0;
          right: 0;
          bottom: 0;
          height: 12rem;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
        }
        .level5-note-overlay {
          position: absolute;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            radial-gradient(circle at 50% 45%, rgba(177, 133, 72, 0.14), transparent 34%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.62), rgba(0, 0, 0, 0.82));
          backdrop-filter: blur(4px);
        }
        .level5-aged-parchment {
          position: relative;
          isolation: isolate;
          width: min(720px, 91vw);
          padding: clamp(3.2rem, 6vw, 4.8rem) clamp(2.8rem, 6.4vw, 5.4rem);
          transform: rotate(-0.35deg);
          clip-path: polygon(2% 8%, 9% 3%, 24% 4%, 37% 1%, 53% 4%, 70% 2%, 91% 4%, 98% 10%, 96% 31%, 99% 52%, 96% 75%, 98% 92%, 88% 98%, 69% 96%, 52% 99%, 35% 96%, 15% 98%, 3% 90%, 5% 71%, 1% 53%, 4% 32%);
          background:
            radial-gradient(circle at 18% 18%, rgba(218, 190, 137, 0.14), transparent 20%),
            radial-gradient(circle at 82% 76%, rgba(0, 0, 0, 0.28), transparent 28%),
            linear-gradient(110deg, transparent 0 45%, rgba(24, 18, 12, 0.25) 45% 46%, transparent 46%),
            linear-gradient(165deg, rgba(220, 194, 145, 0.11), transparent 32%, rgba(0, 0, 0, 0.34)),
            #51463a;
          box-shadow:
            0 42px 120px rgba(0, 0, 0, 0.88),
            0 0 45px rgba(212, 175, 55, 0.06),
            inset 0 2px 3px rgba(238, 213, 164, 0.12),
            inset 0 -32px 56px rgba(0, 0, 0, 0.32),
            inset 0 0 0 2px rgba(22, 17, 12, 0.38);
        }
        .level5-aged-parchment::before,
        .level5-aged-parchment::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
        }
        .level5-aged-parchment::before {
          background:
            linear-gradient(72deg, transparent 0 28%, rgba(14, 11, 8, 0.36) 28.4%, transparent 29.2%),
            linear-gradient(146deg, transparent 0 66%, rgba(14, 11, 8, 0.28) 66.4%, transparent 67.3%),
            radial-gradient(circle at 8% 40%, rgba(0, 0, 0, 0.24), transparent 19%),
            radial-gradient(circle at 93% 22%, rgba(0, 0, 0, 0.28), transparent 15%),
            radial-gradient(circle at 74% 96%, rgba(0, 0, 0, 0.28), transparent 22%);
          mix-blend-mode: multiply;
        }
        .level5-aged-parchment::after {
          inset: 14px;
          border: 1px solid rgba(18, 14, 10, 0.42);
          clip-path: inherit;
          box-shadow:
            inset 0 1px 0 rgba(237, 211, 161, 0.08),
            inset 0 -2px 10px rgba(0, 0, 0, 0.28);
        }
        .level5-parchment-pin {
          position: absolute;
          top: 1.4rem;
          height: 2.7rem;
          width: 5.2rem;
          border-radius: 45% 55% 38% 62%;
          background:
            radial-gradient(circle at 35% 30%, rgba(231, 205, 151, 0.09), transparent 34%),
            linear-gradient(150deg, rgba(0, 0, 0, 0.34), rgba(83, 71, 57, 0.42));
          box-shadow:
            inset 0 1px 1px rgba(232, 206, 157, 0.08),
            inset 0 -8px 15px rgba(0, 0, 0, 0.28);
          opacity: 0.62;
        }
        .level5-parchment-pin-left {
          left: 10%;
          transform: rotate(-12deg);
        }
        .level5-parchment-pin-right {
          right: 9%;
          transform: rotate(10deg);
        }
        .level5-parchment-title {
          margin-bottom: 2rem;
          text-align: center;
          color: rgba(30, 23, 17, 0.72);
        }
        .level5-parchment-title h3 {
          margin: 0;
          font-family: Georgia, serif;
          font-size: clamp(1.75rem, 4vw, 2.45rem);
          font-style: italic;
          letter-spacing: 0.08em;
          text-shadow:
            0 1px 0 rgba(225, 200, 151, 0.12),
            0 -1px 0 rgba(0, 0, 0, 0.58);
        }
        .level5-parchment-poem {
          text-align: center;
          font-family: Georgia, serif;
          font-size: clamp(1.12rem, 2.3vw, 1.42rem);
          font-style: italic;
          line-height: 2.05;
          color: rgba(26, 20, 15, 0.82);
          text-shadow:
            0 1px 0 rgba(229, 203, 153, 0.12),
            0 -1px 0 rgba(0, 0, 0, 0.58),
            1px 0 0 rgba(0, 0, 0, 0.16);
        }
        .level5-parchment-close {
          display: block;
          margin: 2.25rem auto 0;
          border: 1px solid rgba(25, 18, 12, 0.34);
          border-radius: 999px;
          background: rgba(18, 13, 9, 0.1);
          padding: 0.55rem 1.15rem;
          color: rgba(28, 21, 15, 0.74);
          cursor: pointer;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          transition: color 180ms ease, transform 180ms ease;
        }
        .level5-parchment-close:hover {
          border-color: rgba(235, 205, 150, 0.18);
          color: rgba(15, 11, 8, 0.92);
          transform: translateY(-1px);
        }
        .level5-scene-frame {
          overflow: hidden;
          background: #000;
          z-index: 50;
        }
        .level5-scene-backdrop,
        .level5-scene-image {
          width: 100%;
          height: 100%;
          pointer-events: none;
          user-select: none;
        }
        .level5-scene-backdrop {
          object-fit: cover;
          filter: blur(24px) brightness(0.38) saturate(0.82);
          transform: scale(1.1);
        }
        .level5-scene-image {
          object-fit: contain;
          filter: brightness(0.88) contrast(1.08) saturate(0.9);
        }
        .level5-scene-label {
          position: absolute;
          left: 2rem;
          top: 2rem;
          z-index: 80;
          max-width: 24rem;
          pointer-events: none;
          text-shadow: 0 0 18px rgba(0,0,0,0.9);
        }
        .level5-scene-label span {
          color: rgba(212,175,55,0.72);
          font-size: 10px;
          letter-spacing: 0.42em;
          text-transform: uppercase;
        }
        .level5-scene-label h1 {
          margin: 0.75rem 0 0;
          color: #f1dfb8;
          font-size: clamp(1.35rem, 3vw, 2rem);
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .level5-scene-label p {
          margin-top: 0.75rem;
          color: rgba(200,189,168,0.82);
          font-family: Georgia, serif;
          font-size: 0.95rem;
          font-style: italic;
          line-height: 1.6;
        }
        .level5-wall-carving {
          position: absolute;
          left: 50%;
          top: 48.5%;
          z-index: 58;
          width: min(760px, 61vw);
          height: min(390px, 45vh);
          transform: translate(-50%, -50%);
          color: rgba(27, 22, 17, 0.64);
          filter: drop-shadow(0 1px 0 rgba(218, 184, 116, 0.18)) drop-shadow(0 -1px 0 rgba(0, 0, 0, 0.72));
        }
        .level5-wall-carving-panel {
          position: absolute;
          display: flex;
          width: clamp(128px, 13vw, 172px);
          min-height: clamp(170px, 24vh, 240px);
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: clamp(0.55rem, 1.2vh, 0.9rem);
          opacity: 0.8;
        }
        .level5-wall-carving-panel-left {
          left: 9%;
          top: 50%;
          transform: translateY(-50%) rotate(-1.8deg);
        }
        .level5-wall-carving-panel-center {
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%) rotate(0.7deg);
        }
        .level5-wall-carving-panel-right {
          right: 9%;
          top: 50%;
          transform: translateY(-50%) rotate(1.8deg);
        }
        .level5-wall-carving-panel::before {
          content: "";
          position: absolute;
          inset: 3% 4%;
          border-radius: 38% 38% 9% 9%;
          background:
            radial-gradient(circle at 42% 18%, rgba(255, 225, 165, 0.08), transparent 26%),
            linear-gradient(180deg, rgba(0, 0, 0, 0.18), rgba(255, 229, 170, 0.035) 45%, rgba(0, 0, 0, 0.22));
          box-shadow:
            inset 0 2px 5px rgba(255, 227, 169, 0.09),
            inset 0 -4px 12px rgba(0, 0, 0, 0.34);
        }
        .level5-wall-carving-roman {
          position: relative;
          font-family: Georgia, serif;
          font-size: clamp(2.1rem, 4.4vw, 4.1rem);
          font-weight: 700;
          letter-spacing: 0.08em;
          line-height: 1;
          text-shadow:
            0 1px 0 rgba(224, 196, 137, 0.17),
            0 -2px 0 rgba(0, 0, 0, 0.72),
            2px 0 0 rgba(0, 0, 0, 0.26);
        }
        .level5-wall-carving-groove {
          position: relative;
          display: block;
          height: clamp(86px, 13vh, 132px);
          width: clamp(54px, 6vw, 76px);
          border-radius: 999px;
          box-shadow:
            inset 0 0 0 2px rgba(0, 0, 0, 0.42),
            inset 0 10px 18px rgba(0, 0, 0, 0.4),
            inset 0 -2px 3px rgba(230, 198, 136, 0.08);
        }
        .level5-wall-carving-track {
          position: absolute;
          left: 50%;
          top: 13%;
          bottom: 13%;
          width: 8px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.42);
          box-shadow: 1px 0 0 rgba(234, 203, 151, 0.08);
        }
        .level5-wall-carving-handle {
          position: absolute;
          left: 50%;
          height: clamp(24px, 3.2vh, 34px);
          width: clamp(42px, 5vw, 62px);
          transform: translateX(-50%);
          border-radius: 999px;
          background: rgba(43, 35, 25, 0.7);
          box-shadow:
            inset 0 2px 2px rgba(255, 227, 171, 0.12),
            inset 0 -4px 8px rgba(0, 0, 0, 0.5),
            0 1px 0 rgba(226, 195, 136, 0.12);
        }
        .level5-wall-carving-groove.is-up .level5-wall-carving-handle {
          top: 17%;
        }
        .level5-wall-carving-groove.is-down .level5-wall-carving-handle {
          bottom: 17%;
        }
        .level5-wall-carving-word {
          position: relative;
          font-family: Georgia, serif;
          font-size: clamp(0.72rem, 1.1vw, 0.96rem);
          letter-spacing: 0.34em;
          text-indent: 0.34em;
          text-shadow:
            0 1px 0 rgba(221, 193, 139, 0.12),
            0 -1px 0 rgba(0, 0, 0, 0.75);
        }
        .level5-wall-carving-verse {
          position: absolute;
          left: 50%;
          top: 103%;
          width: min(520px, 86vw);
          transform: translateX(-50%);
          text-align: center;
          font-family: Georgia, serif;
          font-size: clamp(0.8rem, 1.35vw, 1.08rem);
          font-style: italic;
          letter-spacing: 0.04em;
          color: rgba(36, 29, 22, 0.72);
          text-shadow:
            0 1px 0 rgba(226, 196, 143, 0.13),
            0 -1px 0 rgba(0, 0, 0, 0.72);
        }
        .level5-stone-poem-fragment {
          position: absolute;
          right: 6.5%;
          bottom: 13%;
          z-index: 60;
          width: min(410px, 36vw);
          padding: 1.6rem 2rem;
          transform: rotate(0.8deg);
          clip-path: polygon(2% 9%, 15% 3%, 38% 5%, 59% 2%, 82% 5%, 98% 12%, 96% 36%, 100% 63%, 93% 94%, 70% 97%, 43% 95%, 18% 99%, 3% 88%, 0 56%, 4% 29%);
          background:
            linear-gradient(64deg, transparent 0 37%, rgba(0, 0, 0, 0.26) 37.4%, transparent 38%),
            radial-gradient(circle at 22% 20%, rgba(221, 195, 143, 0.1), transparent 26%),
            radial-gradient(circle at 88% 80%, rgba(0, 0, 0, 0.28), transparent 31%),
            linear-gradient(160deg, rgba(205, 176, 120, 0.08), transparent 34%, rgba(0, 0, 0, 0.3)),
            rgba(75, 65, 53, 0.88);
          color: rgba(24, 18, 13, 0.78);
          text-align: center;
          font-family: Georgia, serif;
          font-size: clamp(0.86rem, 1.45vw, 1.05rem);
          font-style: italic;
          line-height: 1.72;
          box-shadow:
            0 12px 35px rgba(0, 0, 0, 0.56),
            inset 0 2px 3px rgba(239, 218, 168, 0.08),
            inset 0 -18px 32px rgba(0, 0, 0, 0.24);
          text-shadow:
            0 1px 0 rgba(213, 190, 145, 0.1),
            0 -1px 0 rgba(0, 0, 0, 0.55),
            1px 0 0 rgba(0, 0, 0, 0.12);
        }
        .level5-stone-poem-fragment::before {
          content: "";
          position: absolute;
          inset: 9px;
          border: 1px solid rgba(26, 20, 14, 0.28);
          clip-path: inherit;
          pointer-events: none;
          box-shadow: inset 0 1px 0 rgba(232, 205, 156, 0.06);
        }
        .level5-stone-poem-fragment div {
          margin-bottom: 0.85rem;
          font-family: 'Cinzel', Georgia, serif;
          font-size: 0.7rem;
          font-style: normal;
          font-weight: 700;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          color: rgba(22, 16, 11, 0.68);
        }
        .level5-stone-poem-fragment p {
          margin: 0;
        }
        .level5-hotspot {
          position: absolute;
          z-index: 120;
          border: 0;
          background: transparent;
          cursor: pointer;
          border-radius: 2rem;
          color: inherit;
        }
        .level5-hotspot-levers {
          left: 7%;
          top: 31%;
          width: 21%;
          height: 45%;
        }
        .level5-hotspot-altar {
          right: 6%;
          bottom: 6%;
          width: 29%;
          height: 43%;
        }
        .level5-hotspot-tablet {
          left: 72%;
          top: 16%;
          width: 17%;
          height: 29%;
        }
        .level5-hotspot-glow,
        .level5-hotspot-dot,
        .level5-hotspot-label {
          position: absolute;
          pointer-events: none;
        }
        .level5-hotspot-glow {
          inset: 0;
          border-radius: 2rem;
          border: 1px solid transparent;
          transition: all 250ms ease;
        }
        .level5-hotspot:hover .level5-hotspot-glow {
          border-color: rgba(251,226,166,0.38);
          background: rgba(251,226,166,0.045);
          box-shadow: 0 0 34px rgba(212,175,55,0.18), inset 0 0 28px rgba(255,235,174,0.08);
        }
        .level5-hotspot-dot {
          left: 50%;
          top: 50%;
          width: 8px;
          height: 8px;
          border-radius: 999px;
          transform: translate(-50%, -50%);
          transition: all 250ms ease;
        }
        .level5-hotspot:hover .level5-hotspot-dot {
          background: rgba(251,226,166,0.85);
          box-shadow: 0 0 20px rgba(251,191,36,0.85);
        }
        .level5-hotspot-label {
          left: 50%;
          bottom: 0;
          transform: translate(-50%, 130%);
          white-space: nowrap;
          border: 1px solid rgba(92,64,38,0.7);
          border-radius: 999px;
          background: rgba(0,0,0,0.7);
          padding: 0.5rem 1rem;
          color: transparent;
          font-size: 10px;
          letter-spacing: 0.25em;
          text-transform: uppercase;
          transition: color 250ms ease;
        }
        .level5-hotspot:hover .level5-hotspot-label {
          color: rgba(255,243,214,0.92);
        }
        .level5-sponge-pickup {
          position: absolute;
          left: 45%;
          bottom: 5%;
          z-index: 30;
          transform: scale(0.75);
        }
        .level5-sponge-pickup img {
          width: 48px;
          height: 48px;
          object-fit: cover;
          border-radius: 999px;
        }
        .level5-modal-backdrop {
          position: absolute;
          inset: 0;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: rgba(0,0,0,0.72);
          backdrop-filter: blur(10px);
        }
        .level5-lever-window {
          position: relative;
          width: min(1120px, 94vw);
          height: min(78vh, 760px);
          overflow: hidden;
          border: 1px solid rgba(212,175,55,0.28);
          border-radius: 1.4rem;
          background: #000;
          box-shadow: 0 34px 120px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,230,176,0.08);
        }
        .level5-playable-levers {
          position: absolute;
          inset: 0;
          z-index: 75;
          pointer-events: none;
        }
        .level5-play-lever {
          position: absolute;
          width: clamp(44px, 4.6vw, 68px);
          height: clamp(175px, 24vh, 255px);
          border: 0;
          background: transparent;
          cursor: pointer;
          pointer-events: auto;
          transform: translate(-50%, -50%);
          outline: none;
        }
        .level5-play-lever-1 {
          left: 41.6%;
          top: 52.8%;
        }
        .level5-play-lever-2 {
          left: 50%;
          top: 52.8%;
        }
        .level5-play-lever-3 {
          left: 58.4%;
          top: 52.8%;
        }
        .level5-lever-slot {
          position: absolute;
          left: 50%;
          top: 10%;
          width: 28%;
          height: 78%;
          transform: translateX(-50%);
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(0,0,0,0.78), rgba(45,32,20,0.9));
          border: 1px solid rgba(229,216,179,0.16);
          box-shadow: inset 0 0 18px rgba(0,0,0,0.9), 0 0 28px rgba(0,0,0,0.55);
        }
        .level5-lever-arm {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 16%;
          height: 54%;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: linear-gradient(90deg, #1b130d, #6b4a2c 45%, #1b130d);
          border: 1px solid rgba(246,215,123,0.18);
          box-shadow: inset 0 0 8px rgba(0,0,0,0.75), 0 12px 22px rgba(0,0,0,0.5);
          transition: transform 260ms ease, top 260ms ease;
        }
        .level5-lever-knob {
          position: absolute;
          left: 50%;
          width: 78%;
          height: 19%;
          transform: translateX(-50%);
          border-radius: 999px;
          background: radial-gradient(circle at 38% 28%, #d8b270, #7b4d24 48%, #2a170d 100%);
          border: 1px solid rgba(255,232,178,0.25);
          box-shadow: inset 0 0 14px rgba(0,0,0,0.45), 0 10px 26px rgba(0,0,0,0.72);
          transition: top 260ms ease, bottom 260ms ease, box-shadow 260ms ease;
        }
        .level5-play-lever.is-up .level5-lever-knob {
          top: 12%;
        }
        .level5-play-lever.is-down .level5-lever-knob {
          top: 68%;
        }
        .level5-play-lever.is-up .level5-lever-arm {
          transform: translate(-50%, -34%);
        }
        .level5-play-lever.is-down .level5-lever-arm {
          transform: translate(-50%, -66%);
        }
        .level5-lever-number {
          position: absolute;
          left: 50%;
          bottom: -10%;
          transform: translateX(-50%);
          color: rgba(245,222,160,0.55);
          font-family: Georgia, serif;
          font-size: 1rem;
          text-shadow: 0 2px 8px rgba(0,0,0,0.9);
        }
        .level5-play-lever:hover .level5-lever-knob {
          box-shadow: inset 0 0 14px rgba(0,0,0,0.45), 0 10px 26px rgba(0,0,0,0.72), 0 0 26px rgba(212,175,55,0.25);
        }
        .level5-play-lever:focus-visible .level5-lever-slot {
          outline: 2px solid rgba(246,215,123,0.75);
          outline-offset: 6px;
        }
        @media (max-width: 720px) {
          .level5-modal-backdrop {
            padding: 0.75rem;
          }
          .level5-lever-window {
            width: 96vw;
            height: 82vh;
            border-radius: 1rem;
          }
          .level5-play-lever-1 { left: 40%; }
          .level5-play-lever-3 { left: 60%; }
        }
      `}</style>
    </div>
  );
}
