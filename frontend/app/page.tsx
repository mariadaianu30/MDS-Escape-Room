"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Lock, CheckCircle, Volume2, VolumeX, BookOpen, ChevronRight } from "lucide-react";
import "./particles.css";

// Floating dust motes — purely decorative
const DustMote = ({ style }: { style: React.CSSProperties }) => (
  <div className="mote" style={style} />
);

const MOTES = Array.from({ length: 28 }, (_, i) => ({
  left: `${(i * 37 + 11) % 100}%`,
  top: `${(i * 53 + 7) % 100}%`,
  width: `${(i % 3) + 1}px`,
  height: `${(i % 3) + 1}px`,
  "--duration": `${12 + (i % 10)}s`,
  animationDelay: `${(i * 0.7) % 10}s`,
} as React.CSSProperties));

const LABELS = [
  "The Mathematical Library", 
  "The Alchemist's Lab", 
  "The Astronomer's Tower", 
  "The Crypt of Codes", 
  "The Final Chamber"
];

export default function IntroHome() {
  const router = useRouter();
  const [completedLevel, setCompletedLevel] = useState(0);
  const [isZooming, setIsZooming] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isExploring, setIsExploring] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const [shakingDoor, setShakingDoor] = useState<number | null>(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes flicker {
        0%, 100% { opacity: 0.9; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }
      @keyframes torch-fire {
        0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; }
        25% { transform: translateY(-3px) translateX(2px) scale(1.2); opacity: 1; }
        50% { transform: translateY(2px) translateX(-2px) scale(0.9); opacity: 0.7; }
        75% { transform: translateY(-1px) translateX(0) scale(1.1); opacity: 0.9; }
      }
      @keyframes shake {
        0% { transform: translateX(0); }
        25% { transform: translateX(-15px); }
        50% { transform: translateX(15px); }
        75% { transform: translateX(-15px); }
        100% { transform: translateX(0); }
      }
      .anim-flicker { animation: flicker 1.8s infinite ease-in-out alternate; }
      .anim-torch { animation: torch-fire 0.2s infinite alternate; }
      .anim-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      
      .corridor-zoom {
         transform: scale(4) translateY(100px);
         opacity: 0;
         transition: all 1.8s ease-in;
         transform-origin: top center;
      }
      .mist-move {
         animation: mistMove 25s infinite linear alternate;
      }
      @keyframes mistMove {
         0% { transform: translateX(-3%) translateY(5px) scale(1.05); opacity: 0.5; }
         100% { transform: translateX(3%) translateY(-5px) scale(1.1); opacity: 0.8; }
      }
    `;
    document.head.appendChild(style);
    
    const comp = localStorage.getItem("escapeRoomCompletedLevel");
    if (comp) {
       setCompletedLevel(parseInt(comp, 10));
    }
    
    audioRef.current = new Audio("https://actions.google.com/sounds/v1/ambiences/huge_water_cave.ogg");
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;

    return () => {
      document.head.removeChild(style);
      if (audioRef.current) {
         audioRef.current.pause();
      }
    };
  }, []);

  const handleGlobalInteraction = () => {
     if (!hasInteracted) {
        setHasInteracted(true);
        setIsMuted(false);
        if (audioRef.current) audioRef.current.play().catch(e => console.log("Audio play prevented:", e));
     }
  };

  const toggleMusic = (e: React.MouseEvent) => {
     e.stopPropagation();
     if (!audioRef.current) return;
     if (isMuted) {
        audioRef.current.play();
        setIsMuted(false);
     } else {
        audioRef.current.pause();
        setIsMuted(true);
     }
  };

  const attemptEnterDoor = (level: number) => {
    const isUnlocked = level === 1 || completedLevel >= level - 1;
    if (!isUnlocked) {
       setShakingDoor(level);
       setTimeout(() => setShakingDoor(null), 400);
       return;
    }

    if (level === 1) {
       // Snap to top to ensure clean zoom origin!
       window.scrollTo({ top: 0, behavior: 'smooth' });
       setIsZooming(true);
       
       const GAME_DURATION = 30 * 60; 
       localStorage.setItem("escapeRoomEndTime", (Date.now() + GAME_DURATION * 1000).toString());
       
       setTimeout(() => {
          router.push(`/level1`);
       }, 1600);
    } else {
       router.push(`/level${level}`);
    }
  };

  return (
    <main 
      onClick={handleGlobalInteraction}
      className={`min-h-screen relative bg-black font-cormorant flex flex-col items-center select-none text-[#e5d8b3] transition-opacity duration-1000 overflow-hidden ${isZooming ? "pointer-events-none" : ""}`}
    >

      {/* ========== HERO LANDING SCREEN ========== */}
      {!isExploring && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
          {/* Background with Ken Burns zoom */}
          <div 
            className="absolute inset-0 bg-cover bg-center ken-burns brightness-[0.6] scale-105"
            style={{ backgroundImage: 'url(/images/landing_bg.png)' }}
          />
          {/* Dark vignette — top & bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black" />
          {/* Golden side glows */}
          <div className="absolute left-0 inset-y-0 w-[30vw] bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />
          <div className="absolute right-0 inset-y-0 w-[30vw] bg-gradient-to-l from-black/60 to-transparent pointer-events-none" />
          {/* Warm amber accent glow from bottom */}
          <div className="absolute bottom-0 inset-x-0 h-[40vh] bg-gradient-to-t from-[#8b5e1a]/20 to-transparent pointer-events-none" />

          {/* Floating dust motes */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {MOTES.map((s, i) => <DustMote key={i} style={s} />)}
          </div>

          {/* Central content */}
          <div className="relative z-10 flex flex-col items-center text-center px-6">
            {/* Decorative top line */}
            <div className="flex items-center gap-4 mb-6 opacity-60">
              <div className="h-px w-16 md:w-32 bg-gradient-to-r from-transparent to-[#d4af37]" />
              <span className="font-cinzel text-[#d4af37] text-[10px] md:text-xs tracking-[0.6em] uppercase">Est. Veritas</span>
              <div className="h-px w-16 md:w-32 bg-gradient-to-l from-transparent to-[#d4af37]" />
            </div>

            <p className="font-cinzel text-[#d4af37] text-base md:text-xl tracking-[0.5em] mb-5 opacity-80 uppercase animate-pulse">
              Seek The Hidden Truth
            </p>

            <h1 className="font-cinzel text-6xl md:text-[9rem] text-[#e5d8b3] cinematic-title drop-shadow-[0_0_60px_rgba(0,0,0,1)] uppercase font-bold tracking-tighter leading-none mb-3">
              Escape
            </h1>
            <h1 className="font-cinzel text-6xl md:text-[9rem] text-[#d4af37] cinematic-title drop-shadow-[0_0_40px_rgba(212,175,55,0.6)] uppercase font-bold tracking-tighter leading-none mb-10">
              Room
            </h1>

            {/* Decorative middle line */}
            <div className="flex items-center gap-3 mb-10 opacity-50">
              <div className="h-px w-10 md:w-20 bg-[#d4af37]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#d4af37]" />
              <div className="h-px w-10 md:w-20 bg-[#d4af37]" />
            </div>
            
            <button 
              onClick={() => setIsExploring(true)}
              className="group relative px-16 py-6 overflow-hidden rounded-full border-2 border-[#d4af37]/50 bg-black/50 backdrop-blur-xl transition-all duration-500 hover:border-[#d4af37] hover:shadow-[0_0_60px_rgba(212,175,55,0.4),0_0_120px_rgba(212,175,55,0.1)] active:scale-95"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#d4af37]/0 via-[#d4af37]/15 to-[#d4af37]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              <div className="relative flex items-center gap-5 text-xl md:text-2xl font-cinzel tracking-[0.3em] text-[#d4af37] group-hover:text-white transition-colors duration-300 uppercase">
                Enter The Gates
                <ChevronRight size={26} className="group-hover:translate-x-2 transition-transform duration-300" />
              </div>
            </button>
          </div>

          {/* Bottom toolbar */}
          <div className="absolute bottom-10 inset-x-0 flex justify-center gap-12 items-center z-10">
            <div className="h-px w-12 bg-[#5c4026]/60" />
            <button 
              onClick={() => setShowRules(true)} 
              className="text-[#8c7a6b] hover:text-[#d4af37] font-cinzel tracking-[0.3em] text-[10px] border-b border-transparent hover:border-[#d4af37] transition-all pb-0.5 uppercase"
            >Guidelines</button>
            <div className="w-px h-4 bg-[#5c4026]/60" />
            <button onClick={toggleMusic} className="text-[#8c7a6b] hover:text-[#d4af37] transition-all">
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} className="animate-pulse" />}
            </button>
            <div className="h-px w-12 bg-[#5c4026]/60" />
          </div>
        </div>
      )}
      {/* 1. Global Stylized Background FIXED to viewport — with blur layer */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center brightness-[0.7] sepia-[0.2]"
        style={{ backgroundImage: 'url(/images/corridor.png)' }}
      />
      {/* Blur overlay on corridor background */}
      <div className="fixed inset-0 z-[1] backdrop-blur-[3px] bg-black/10 pointer-events-none" />
      
      {/* Dynamic Floor Fog Simulation FIXED to viewport bottom */}
      <div className="fixed bottom-0 left-0 right-0 h-[30vh] z-10 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none mix-blend-multiply" />
      <div className="fixed bottom-[-50px] left-[-10vw] right-[-10vw] h-[40vh] z-[12] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mist-move pointer-events-none opacity-40 mix-blend-screen" />

      <div className={`relative w-full z-20 flex-col items-center transition-transform duration-1000 ${isZooming ? 'corridor-zoom' : ''}`}>
         
         {/* Top Header UI */}
         <div className={`w-full flex justify-between items-start pt-14 px-6 md:px-12 transition-opacity duration-1000 ${isZooming ? 'opacity-0' : 'opacity-100'}`}>
            <button 
               onClick={() => setShowRules(true)}
               className="flex items-center gap-2 group text-[#c7baaa] hover:text-[#d4af37] transition-all bg-black/70 px-5 py-3 uppercase tracking-widest text-xs md:text-sm font-cinzel border border-[#5c4026]/60 rounded-lg hover:border-[#d4af37] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] backdrop-blur-xl"
            >
               <BookOpen size={16} />
               <span className="hidden md:inline">How to Play</span>
            </button>

            <div className="flex flex-col items-center gap-1">
               <span className="font-cinzel text-[10px] tracking-[0.5em] text-[#8c7a6b] uppercase opacity-60">The Ancient Halls</span>
               <h1 className="font-cinzel text-4xl md:text-7xl text-[#d4af37] drop-shadow-[0_0_40px_rgba(212,175,55,0.7)] tracking-[0.1em] text-center font-bold cinematic-title">
                  Escape Room
               </h1>
            </div>

            <button 
               onClick={toggleMusic}
               className={`p-3 md:p-4 rounded-full border transition-all backdrop-blur-xl flex items-center justify-center
               ${!hasInteracted || isMuted 
                  ? 'bg-black/80 border-[#5c4026]/60 text-[#8c7a6b] hover:text-[#d4af37] hover:border-[#d4af37]' 
                  : 'bg-black/60 border-[#d4af37] text-[#d4af37] shadow-[0_0_20px_rgba(212,175,55,0.4)]'}
               `}
            >
               {isMuted ? <VolumeX size={22} /> : <Volume2 size={22} className="animate-pulse" />}
            </button>
         </div>

         {/* Scrollable Linear Corridor Logic */}
         <div className="w-full flex flex-col items-center gap-[150px] md:gap-[250px] mt-24 md:mt-32 pb-48">
            
            {/* Draw mapping of 5 doors strictly rendered one below another! */}
            {[1, 2, 3, 4, 5].map((level) => {
               const isUnlocked = level === 1 || completedLevel >= level - 1;
               const isCompleted = completedLevel >= level;
               const isHoverMain = level === 1 && !isCompleted;
               const isShaking = shakingDoor === level;

               return (
                  <div 
                    key={level}
                    className={`relative flex flex-col items-center group
                       ${isShaking ? 'anim-shake' : ''}
                    `}
                  >
                     

                     {/* Room label — refined */}
                     <div className="flex flex-col items-center mb-6 md:mb-10 text-center">
                        <span className={`font-cinzel text-[10px] tracking-[0.5em] uppercase mb-2 transition-colors duration-300
                           ${isUnlocked ? 'text-[#d4af37]/60' : 'text-[#5c4026]/40'}
                        `}>Chamber {level}</span>
                        <span className={`font-cinzel text-2xl md:text-4xl font-bold tracking-widest drop-shadow-[0_0_20px_black] text-center bg-black/70 px-8 py-4 rounded-xl border backdrop-blur-md transition-all duration-[400ms]
                           ${isHoverMain ? 'text-[#e5d8b3] border-[#d4af37]/70 shadow-[0_0_40px_rgba(212,175,55,0.5)]' : isUnlocked ? 'text-[#c7baaa] border-[#5c4026]/50' : 'text-[#5c4026]/50 border-[#5c4026]/20'}
                        `}>
                           {LABELS[level - 1]}
                        </span>
                     </div>
                     
                     {/* The Physical Stylized RPG Door Element */}
                     <div 
                        onClick={() => attemptEnterDoor(level)}
                        className={`
                           relative w-[300px] h-[480px] md:w-[420px] md:h-[640px] rounded-t-full flex items-center justify-center transition-all duration-700
                           ${isHoverMain ? 'cursor-pointer shadow-[0_0_120px_rgba(212,175,55,0.7)]' : 'shadow-[0_0_80px_black]'}
                           ${!isUnlocked ? 'cursor-not-allowed filter grayscale-[30%] brightness-50 contrast-125' : ''}
                        `}
                        style={{ 
                           backgroundImage: 'url(/images/door.png)',
                           backgroundSize: 'cover',
                           backgroundPosition: 'center',
                           border: isHoverMain ? '6px solid rgba(212,175,55,0.8)' : '4px solid rgba(0,0,0,0.9)',
                           transform: isCompleted ? 'perspective(1200px) rotateY(-35deg)' : 'perspective(1200px) rotateY(0deg)',
                           transformOrigin: 'left'
                        }}
                     >
                        {/* Door Embedded ambient darkness */}
                        <div className="absolute inset-0 bg-black/30 rounded-t-full pointer-events-none" />

                        {/* Artificial Glowing Magic Frame overlay */}
                        {isUnlocked && !isCompleted && (
                           <div className="absolute inset-0 rounded-t-full mix-blend-color-dodge bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.4)_0%,transparent_80%)] anim-flicker pointer-events-none" />
                        )}

                        {/* Hover Overlay Logic */}
                        <div className={`absolute inset-0 rounded-t-full transition-colors duration-500 pointer-events-none
                           ${isHoverMain ? 'group-hover:bg-[#d4af37]/10' : ''}
                        `} />

                        {/* Locked/Unlocked States Marker */}
                        {!isCompleted && (
                        <div className={`relative z-10 p-6 rounded-full border-2 shadow-[0_0_50px_black] bg-black/90 transition-colors duration-500
                           ${isUnlocked ? 'border-[#5c4026] group-hover:bg-[#2a1d0f]' : 'border-red-900'}
                        `}>
                           {!isUnlocked ? (
                              <div className="relative group/lock">
                                 <Lock className="w-12 h-12 md:w-16 md:h-16 text-red-600/80" strokeWidth={2} />
                                 <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[220px] bg-[#1a1107] border border-red-900 text-red-400 text-sm px-4 py-2 rounded opacity-0 group-hover/lock:opacity-100 transition-opacity font-cormorant text-center pointer-events-none">
                                    Complete the previous level to unlock
                                 </div>
                              </div>
                           ) : (
                              <div className="text-4xl md:text-5xl font-cinzel text-[#e5d8b3] text-center w-12 h-12 md:w-16 md:h-16 font-bold flex items-center justify-center drop-shadow-[0_0_10px_white]">
                                 {level}
                              </div>
                           )}
                        </div>
                        )}
                     </div>

                  </div>
               );
            })}
         </div>

         {/* 4. Bottom Play Button Container (Anchored at very bottom sequence) */}
         <div className={`w-full flex justify-center pb-32 transition-opacity duration-1000 ${isZooming ? 'opacity-0' : 'opacity-100'}`}>
            <button 
               onClick={() => attemptEnterDoor(1)}
               className="font-cinzel text-5xl md:text-7xl text-[#1a1107] font-bold tracking-[0.2em] bg-[radial-gradient(ellipse_at_center,_#ffedb3_0%,_#d4af37_100%)] px-24 py-8 rounded-xl shadow-[0_0_100px_rgba(212,175,55,1)] hover:shadow-[0_0_150px_rgba(255,237,179,1)] hover:scale-105 active:scale-95 transition-all duration-300 uppercase animate-pulse border-4 border-white/50"
            >
               Play 
            </button>
         </div>

      </div>

      {/* 5. Rules & Lore Modal overlay (Anchored fixed above everything!) */}
      {showRules && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md animate-in fade-in duration-300 px-4">
            <div className="relative max-w-3xl w-full mx-auto bg-[#150e09] border-[3px] border-[#d4af37] p-10 md:p-16 rounded-xl shadow-[0_0_100px_rgba(212,175,55,0.3)] bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]">
               
               <button 
                  onClick={() => setShowRules(false)}
                  className="absolute top-4 right-4 md:top-6 md:right-6 w-12 h-12 flex items-center justify-center bg-black border border-[#5c4026] text-[#c7baaa] hover:text-[#d4af37] hover:border-[#d4af37] font-cinzel text-2xl font-bold transition-all rounded"
               >
                  X
               </button>

               <h2 className="font-cinzel text-4xl md:text-5xl text-[#d4af37] mb-8 text-center tracking-widest drop-shadow-[0_0_15px_rgba(212,175,55,0.6)] font-bold">How to Play</h2>
               
               <div className="space-y-6 text-[#e5d8b3] font-cormorant text-xl md:text-2xl leading-relaxed">
                  <p className="italic border-b-2 border-[#5c4026] pb-8 text-center md:px-8">
                     "You have been trapped deep inside the ancient catacombs. Five archaic rooms block your path to salvation. Solve the mechanical riddles hidden within each chamber, or the walls will forever seal your fate."
                  </p>
                  
                  <ul className="list-disc pl-6 md:pl-8 pt-4 space-y-4 marker:text-[#d4af37]">
                     <li><strong>5 Chambers:</strong> Proceed in order to unlock deeper rooms.</li>
                     <li><strong>The Vault Clock:</strong> You possess merely <span className="text-red-400 font-bold tracking-wider">30 Minutes</span> of absolute global timeline across the entire game.</li>
                     <li><strong>The Mechanism Tolerance:</strong> Attempting to force an incorrect combination will jam the gears. You have a maximum of <span className="text-red-400 font-bold tracking-wider">3 Mistakes</span> per room before the puzzle abruptly resets.</li>
                     <li><strong>Victory Rule:</strong> Calculate the combinations. Turn the tumblers. Wait for the heavy stone to grind open. Survive.</li>
                  </ul>
               </div>

            </div>
         </div>
      )}

    </main>
  );
}
