"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useInventory } from "@/lib/InventoryContext";
import CollectibleItem from "@/components/CollectibleItem";
import Timer from "@/components/Timer";

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

const GAME_DURATION = 30 * 60;
const RING_STEP = 30;
const RING_TARGETS = [0, 180, 0];
const RING_LAYERS = [
  { name: "Outer ring", clipRadius: 50, opacity: 0.96 },
  { name: "Middle ring", clipRadius: 35.5, opacity: 1 },
  { name: "Inner ring", clipRadius: 18, opacity: 1 },
];
const RING_HIT_RADII = RING_LAYERS.map(ring => ring.clipRadius * 2);

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
    <img src={src} className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-50 select-none pointer-events-none" alt="" />
    <div className="absolute inset-0 bg-black/25 pointer-events-none" />
    <img src={src} className="absolute inset-0 h-full w-full object-contain select-none pointer-events-none" alt="" />
  </>
);

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

export default function Level5Page() {
  const router = useRouter();
  const { items, addItem, removeItem, equippedItem, setEquippedItem } = useInventory();

  // Scene state
  const [view, setView] = useState<"main" | "levers" | "lever_clue" | "altar" | "chest_full" | "chest_dial">("main");
  const [leverPositions, setLeverPositions] = useState<("u" | "d")[]>(["u", "u", "u"]);
  const [leversSolved, setLeversSolved] = useState(false);
  const [showNote, setShowNote] = useState(false);

  // Rotation Puzzle State
  const [ringRotations, setRingRotations] = useState<number[]>([120, 60, 240]);
  const [chestOpen, setChestOpen] = useState(false);

  const [altarSlots, setAltarSlots] = useState<(string | null)[]>([null, null, null, null]);
  const [doorOpen, setDoorOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const dialRef = useRef<HTMLDivElement>(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isGameOver, setIsGameOver] = useState(false);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const interval = setInterval(() => {
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
  }, []);

  const toggleLever = (index: number) => {
    if (leversSolved) return;
    setLeverPositions(prev => {
      const next = [...prev];
      next[index] = next[index] === "u" ? "d" : "u";
      return next;
    });
  };

  useEffect(() => {
    if (leverPositions[0] === "d" && leverPositions[1] === "u" && leverPositions[2] === "d") {
      setLeversSolved(true);
      showNotification("The stone mechanism unlocks.");
    }
  }, [leverPositions]);

  const handleDialClick = (e: React.MouseEvent) => {
    if (chestOpen || !dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const diameter = Math.min(rect.width, rect.height);
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.sqrt(Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2));
    const relativeRadius = (distance / (diameter / 2)) * 100;

    let ringIdx = -1;
    if (relativeRadius <= RING_HIT_RADII[2]) ringIdx = 2;
    else if (relativeRadius <= RING_HIT_RADII[1]) ringIdx = 1;
    else if (relativeRadius <= RING_HIT_RADII[0]) ringIdx = 0;

    if (ringIdx !== -1) {
      setRingRotations(prev => {
        const next = [...prev];
        next[ringIdx] = (next[ringIdx] + RING_STEP) % 360;
        return next;
      });
    }
  };

  useEffect(() => {
    const solved = ringRotations.every((rotation, index) => rotation % 360 === RING_TARGETS[index]);
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

  const currentLeverImage = `/images/levers_${leverPositions.join("")}.png`;
  const currentRoomImage = leversSolved ? "/images/level5_main_room_bg.png" : "/images/level5_levers_room_bg.png";

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-cinzel select-none">
      <Timer timeLeft={timeLeft} />

      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000"
        style={{
          backgroundImage: `url('${currentRoomImage}')`,
          filter: (view !== "main" || showNote) ? "blur(15px) brightness(0.2)" : "none",
        }}
      />

      {view === "main" && !showNote && (
        <>
          <button onClick={() => setView(leversSolved ? "chest_full" : "levers")} className="absolute left-[8%] top-[35%] w-[18%] h-[40%] z-10" />
          <button onClick={() => setView("altar")} className="absolute right-[8%] bottom-[8%] w-[25%] h-[40%] z-10" />
          <div className="pointer-events-none absolute left-[55.2%] top-[32.8%] z-10 h-[17%] w-[12%]">
            <div className="absolute inset-0 rounded-sm border border-stone-200/18 bg-stone-200/[0.045] shadow-[inset_0_0_24px_rgba(255,216,144,0.08),0_0_18px_rgba(255,190,92,0.08)]" />
            <div className="absolute inset-[10%] rounded-sm border border-stone-100/10" />
            <div className="absolute inset-x-[11%] top-[26%] grid grid-cols-3 items-center text-center font-serif text-[clamp(1.75rem,4vw,4.25rem)] font-bold leading-none text-stone-100/45 mix-blend-soft-light drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)]">
              <span className="translate-y-[12%]">{"\u2193"}</span>
              <span className="-translate-y-[8%]">{"\u2191"}</span>
              <span className="translate-y-[12%]">{"\u2193"}</span>
            </div>
          </div>
          <button
            onClick={() => setView("lever_clue")}
            className="absolute left-[55%] top-[32.5%] z-20 h-[16%] w-[12%] cursor-pointer opacity-0"
            aria-label="Inspect the wall clue"
            title="Inspect wall clue"
          />
          {doorOpen && (
            <div className="absolute left-[42%] top-[30%] w-[16%] h-[50%] flex items-center justify-center z-20">
              <button onClick={() => router.push("/")} className="px-10 py-5 bg-yellow-700/60 text-white font-bold rounded shadow-[0_0_80px_rgba(255,215,0,0.4)] hover:bg-yellow-600 transition-all tracking-[0.6em] animate-pulse">EXIT</button>
            </div>
          )}
          {!items.find(i => i.id === SPONGE_ITEM.id) && (
            <div className="absolute left-[45%] bottom-[5%] z-30 scale-75"><CollectibleItem item={SPONGE_ITEM} /></div>
          )}
        </>
      )}

      {showNote && (
        <div className="absolute inset-0 flex items-center justify-center z-[100] bg-black/65 backdrop-blur-sm">
          <div
            className="relative w-[560px] max-w-[88vw] rotate-[-1deg] px-16 py-14 shadow-2xl select-none"
            style={{
              clipPath: "polygon(3% 8%, 13% 2%, 31% 5%, 48% 1%, 69% 4%, 91% 2%, 98% 14%, 96% 41%, 100% 67%, 94% 96%, 71% 98%, 53% 94%, 34% 100%, 14% 96%, 2% 86%, 0 59%, 4% 35%)",
              backgroundColor: "#b4894c",
              backgroundImage: "radial-gradient(circle at 12% 17%, rgba(251,220,143,0.62), transparent 17%), radial-gradient(circle at 88% 78%, rgba(50,27,11,0.42), transparent 28%), radial-gradient(circle at 52% 48%, rgba(126,74,29,0.20), transparent 46%), linear-gradient(135deg, rgba(255,241,180,0.18), transparent 28%, rgba(44,24,10,0.38))",
              boxShadow: "0 34px 90px rgba(0,0,0,0.82), inset 0 0 0 2px rgba(55,31,14,0.38), inset 0 0 70px rgba(46,24,10,0.58)",
            }}
          >
            <div className="mb-8 text-center text-[#2d190b]">
              <div className="mx-auto mb-4 h-px w-40 bg-[#4a2b13]/45" />
              <h3 className="font-serif text-3xl italic tracking-[0.08em]">The Chest Verse</h3>
              <div className="mx-auto mt-4 h-px w-28 bg-[#4a2b13]/35" />
            </div>
            <p className="text-center font-serif text-[22px] italic leading-[2.05] text-[#251407] drop-shadow-[0_1px_0_rgba(250,224,151,0.3)]">
              "Three circles guard the sleeping wood:<br /><br />
              The outer moon must face the midnight crown.<br />
              The middle sun must bow beneath the earth.<br />
              The inner star returns where night began."
            </p>
            <button onClick={() => setShowNote(false)} className="mt-10 text-[#4b2c14] hover:text-[#201006] text-xs tracking-[0.32em] uppercase font-bold">Close</button>
          </div>
        </div>
      )}

      {view === "levers" && (
        <div className="absolute inset-0 z-50 bg-black">
          <div className="contents">
            <FullscreenSceneImage src={currentLeverImage} />
            <div className="absolute inset-0 flex justify-around px-[15%]">
              {[0, 1, 2].map(i => (
                <div key={i} onClick={() => toggleLever(i)} className="w-[20%] h-full cursor-pointer z-20" />
              ))}
            </div>
            <BackButton onClick={() => setView("main")} />
          </div>
        </div>
      )}

      {view === "lever_clue" && (
        <div className="absolute inset-0 z-50 bg-black">
          <div className="contents">
            <FullscreenSceneImage src="/images/level5_lever_clue_wall.png" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="grid w-[52vw] max-w-[840px] grid-cols-3 gap-[4vw] pt-[4vh] text-center font-serif text-[clamp(4rem,10vw,9rem)] font-bold leading-none text-stone-900/85 drop-shadow-[0_2px_0_rgba(255,232,178,0.3)]">
                <span className="translate-y-[12%]">{"\u2193"}</span>
                <span className="-translate-y-[8%]">{"\u2191"}</span>
                <span className="translate-y-[12%]">{"\u2193"}</span>
              </div>
            </div>
            <div
              className="absolute bottom-[12%] right-[8%] z-[60] w-[min(360px,34vw)] rotate-2 px-8 py-7 text-center font-serif text-[clamp(0.85rem,1.45vw,1.05rem)] italic leading-relaxed text-[#2a1709] shadow-[0_18px_45px_rgba(0,0,0,0.7)]"
              style={{
                clipPath: "polygon(3% 6%, 15% 2%, 36% 5%, 58% 1%, 82% 4%, 97% 10%, 95% 38%, 100% 64%, 92% 96%, 64% 98%, 41% 95%, 17% 99%, 2% 88%, 0 56%, 4% 31%)",
                backgroundColor: "#bb9052",
                backgroundImage: "radial-gradient(circle at 18% 16%, rgba(255,229,154,0.5), transparent 22%), radial-gradient(circle at 86% 74%, rgba(71,37,13,0.42), transparent 30%), linear-gradient(135deg, rgba(255,244,190,0.18), transparent 42%, rgba(56,29,9,0.36))",
              }}
            >
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-[#4a2a12]/80">Altar</div>
              <p>
                From the oldest stone to the newest,
                <br />
                set their fates in order.
                <br />
                The lion begins. The crown ends.
              </p>
            </div>
            <BackButton onClick={() => setView("main")} />
          </div>
        </div>
      )}

      {view === "altar" && (
        <div className="absolute inset-0 z-50 bg-black">
          <div className="contents">
            <FullscreenSceneImage src="/images/level5_altar_zoom_center_stone.png" />
            <AltarImageOverlay>
              <button
                onClick={() => setShowNote(true)}
                className="absolute left-[6%] bottom-[24%] h-[20%] w-[36%] -rotate-2 cursor-pointer"
                aria-label="Read the parchment on the altar"
                title="Read the parchment"
              />
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
          </div>
        </div>
      )}

      {/* STEP 1: FULL CHEST VIEW */}
      {view === "chest_full" && (
        <div className="absolute inset-0 z-50 bg-black">
          <div className="contents">
            <FullscreenSceneImage src={chestOpen ? "/images/level5_chest_open_empty.png" : "/images/level5_chest_zoom.png"} />

            {!chestOpen ? (
              <button
                onClick={() => setView("chest_dial")}
                className="absolute left-[41.5%] top-[3%] w-[49%] aspect-square rounded-full cursor-pointer"
                aria-label="Inspect the chest dial"
              />
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
          </div>
        </div>
      )}

      {/* STEP 2: DIAL/RINGS VIEW */}
      {view === "chest_dial" && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/98">
          <div className="relative flex w-full items-center justify-center px-8">
            {!chestOpen ? (
              <div
                ref={dialRef}
                onClick={handleDialClick}
                className="relative h-[min(72vh,82vw,620px)] w-[min(72vh,82vw,620px)] shrink-0 rounded-full bg-stone-950 shadow-[0_0_120px_rgba(0,0,0,1)] select-none cursor-pointer"
              >
                {RING_LAYERS.map((ring, index) => (
                  <div
                    key={ring.name}
                    className="absolute inset-0 rounded-full overflow-hidden transition-transform duration-500 ease-out"
                    style={{
                      clipPath: `circle(${ring.clipRadius}% at 50% 50%)`,
                      opacity: ring.opacity,
                      transform: `rotate(${ringRotations[index]}deg)`,
                      zIndex: index + 10,
                    }}
                  >
                    <img src="/images/level5_chest_dial.png" className="h-full w-full rounded-full object-cover select-none pointer-events-none" />
                  </div>
                ))}

                <div className="absolute inset-[14.5%] z-40 rounded-full border border-black/50 shadow-[0_0_0_1px_rgba(251,191,36,0.22),inset_0_0_18px_rgba(0,0,0,0.7)] pointer-events-none" />
                <div className="absolute inset-[31.5%] z-40 rounded-full border border-black/55 shadow-[0_0_0_1px_rgba(251,191,36,0.2),inset_0_0_14px_rgba(0,0,0,0.75)] pointer-events-none" />
                <div className="absolute inset-[-2%] z-50 rounded-full border-[10px] border-[#8a5b24] shadow-[inset_0_0_16px_rgba(255,221,138,0.25),0_0_45px_rgba(0,0,0,0.85)] pointer-events-none" />
                <div className="absolute inset-[3%] z-50 rounded-full border border-amber-200/40 pointer-events-none" />

                <div className="absolute left-1/2 top-[3%] z-[60] -translate-x-1/2 text-sm font-bold tracking-[0.2em] text-amber-100 pointer-events-none">XII</div>
                <div className="absolute right-[4%] top-1/2 z-[60] -translate-y-1/2 text-xs font-bold tracking-[0.18em] text-amber-200/80 pointer-events-none">III</div>
                <div className="absolute bottom-[3%] left-1/2 z-[60] -translate-x-1/2 text-sm font-bold tracking-[0.2em] text-amber-100 pointer-events-none">VI</div>
                <div className="absolute left-[4%] top-1/2 z-[60] -translate-y-1/2 text-xs font-bold tracking-[0.18em] text-amber-200/80 pointer-events-none">IX</div>
                <div className="absolute left-1/2 top-0 z-[65] h-[13%] w-1.5 -translate-x-1/2 bg-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.8)] pointer-events-none" />
                <div className="absolute inset-[45%] z-[65] rounded-full border border-amber-200/80 bg-stone-950/70 shadow-[0_0_24px_rgba(251,191,36,0.35)] pointer-events-none" />
              </div>
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

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
        .font-cinzel { font-family: 'Cinzel', serif; }
      `}</style>
    </div>
  );
}
