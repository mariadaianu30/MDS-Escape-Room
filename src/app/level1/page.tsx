"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SudokuGrid from "@/components/SudokuGrid";
import CombinationLock from "@/components/CombinationLock";
import Timer from "@/components/Timer";
import confetti from "canvas-confetti";

const GAME_DURATION = 30 * 60;

export default function Level1() {
  const router = useRouter();
  const [gameId, setGameId] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [extractedCode, setExtractedCode] = useState<string | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  
  // Game Over states
  const [isGameOver, setIsGameOver] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<"mistakes" | "time" | null>(null);

  // Initial Load Timer
  useEffect(() => {
    const endTimeStr = localStorage.getItem("escapeRoomEndTime");
    if (!endTimeStr) {
      router.push("/");
      return;
    }
  }, [router]);

  // Global Timer Loop
  useEffect(() => {
    if (isUnlocked || isGameOver || showLevelComplete) return;
    
    const interval = setInterval(() => {
      const endTimeStr = localStorage.getItem("escapeRoomEndTime");
      if (!endTimeStr) return;
      
      const endTime = parseInt(endTimeStr, 10);
      const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
      
      setTimeLeft(remaining);

      if (remaining <= 0) {
         clearInterval(interval);
         handleTimeUp();
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isUnlocked, isGameOver, showLevelComplete, gameId]);

  const handleTimeUp = () => {
    setGameOverReason("time");
    setIsGameOver(true);
    setTimeout(() => restartGame(), 4000);
  };

  const handleSudokuSolved = (code: string) => {
    setExtractedCode(code);
  };

  const handleDoorUnlocked = () => {
    setIsUnlocked(true);
    
    // Mark as completed in persistent storage!
    const savedLevel = parseInt(localStorage.getItem("escapeRoomCompletedLevel") || "0", 10);
    if (savedLevel < 1) {
       localStorage.setItem("escapeRoomCompletedLevel", "1");
    }

    confetti({
       particleCount: 200,
       spread: 160,
       origin: { y: 0.6 },
       colors: ['#d4af37', '#8c7a6b', '#ffffff', '#e5d8b3']
    });
    
    setTimeout(() => {
      setShowLevelComplete(true);
    }, 3000);
  };

  const handleMistakesGameOver = () => {
    setGameOverReason("mistakes");
    setIsGameOver(true);
    setTimeout(() => restartGame(), 4000);
  };

  const restartGame = () => {
    setIsGameOver(false);
    setGameOverReason(null);
    setExtractedCode(null);
    setIsUnlocked(false);
    setShowLevelComplete(false);
    
    if (gameOverReason === "time") {
       // Reset global clock strictly!
       localStorage.setItem("escapeRoomEndTime", (Date.now() + GAME_DURATION * 1000).toString());
    }

    setGameId((prev) => prev + 1);
  };

  const formatElapsed = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0a0705] font-cormorant flex flex-col items-center select-none">
      
      {/* Background */}
      <div 
        className="fixed inset-0 z-0 opacity-40 mix-blend-screen bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/library.png)' }}
      />
      
      {/* Title */}
      <h1 className="font-cinzel text-3xl md:text-5xl text-[#d4af37] text-center w-full relative z-20 mt-6 mb-2 drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]">
         Level 1 — The Mathematical Library
      </h1>

      {/* Timer */}
      {!showLevelComplete && !isGameOver && <Timer key={`timer-${gameId}`} timeLeft={timeLeft} />}

      <div className="relative z-10 flex flex-col md:flex-row w-full h-full max-h-[calc(100vh-100px)] px-4 md:px-12 items-center justify-center gap-12 md:gap-24 overflow-hidden mt-6">

        {/* Central Desk Area - Sudoku */}
        <div className="flex flex-col items-center justify-center w-full max-w-xl xl:max-w-2xl relative shrink-0">
           <div className="relative p-6 md:p-10 w-full flex flex-col items-center justify-center rounded-2xl shadow-2xl"
             style={{ 
                backgroundImage: 'url(/images/desk.png)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8), 0 20px 50px rgba(0,0,0,0.5)'
             }}
           >
              {/* Overlay for desk readability */}
              <div className="absolute inset-0 bg-yellow-950/30 pointer-events-none rounded-2xl mix-blend-overlay"></div>
              <div className="absolute inset-0 bg-black/50 pointer-events-none rounded-2xl"></div>
              
              <div className="relative z-10 w-full flex flex-col items-center">
                 <SudokuGrid key={`sudoku-${gameId}`} onSolved={handleSudokuSolved} onGameOver={handleMistakesGameOver} />
              </div>
           </div>
        </div>

        {/* Door and Lock Area - Side by Side */}
        <div className="flex flex-col items-center justify-center w-full max-w-sm xl:max-w-md h-full space-y-8 relative perspective-[1200px] shrink-0">
          
          <div className={`mt-4 bg-black/80 border border-[#d4af37] p-4 text-center rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-all duration-500 w-full mb-8 ${extractedCode ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 pointer-events-none translate-y-10 scale-95'}`}>
             <p className="text-[#a89f91] font-cinzel text-sm uppercase tracking-widest mb-2">Extracted Code</p>
             <p className="text-4xl text-[#d4af37] font-bold tracking-[0.2em]">{extractedCode || "XXXXXXXXX"}</p>
          </div>

          <div 
            className={`w-[280px] md:w-[380px] aspect-[2/3] rounded-t-full shadow-2xl relative flex items-center justify-center mt-auto
              ${isUnlocked ? 'door-open-animation' : ''} transition-all duration-[3000ms]
            `}
            style={{ 
              backgroundImage: 'url(/images/door.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              boxShadow: isUnlocked ? 'none' : 'inset 0 0 100px rgba(0,0,0,0.8), 0 0 50px rgba(0,0,0,0.9)'
            }}
          >
            <div className="absolute inset-0 bg-black/50 rounded-t-full pointer-events-none"></div>

            {isUnlocked && (
               <div className="absolute inset-0 bg-white shadow-[0_0_100px_white] -z-10 rounded-t-full animate-pulse blur-3xl"></div>
            )}

            <div className={`transition-opacity duration-1000 ${isUnlocked ? 'opacity-0' : 'opacity-100'}`}>
                <CombinationLock key={`lock-${gameId}`} onUnlock={handleDoorUnlocked} correctCode={extractedCode || "000000000"} />
            </div>
          </div>
        </div>

      </div>

      {showLevelComplete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-1000">
           <div className="p-12 border-4 border-[#d4af37] bg-[#1a1107]/95 text-center rounded shadow-[0_0_150px_rgba(212,175,55,0.4)] max-w-2xl flex flex-col items-center">
              <h1 className="text-5xl md:text-7xl font-cinzel font-bold text-[#e5d8b3] mb-6 drop-shadow-[0_0_10px_rgba(229,216,179,0.5)]">Level Complete</h1>
              <p className="text-xl md:text-2xl text-[#a89f91] mb-6 font-cormorant leading-relaxed">
                The ancient mechanism clicks into place, and the heavy door groans open. The secrets of the mathematical library have been unlocked.
              </p>
              
              <div className="bg-black/60 p-6 rounded-lg border border-[#3c2a1a] mb-8 w-full shadow-[inset_0_0_30px_black]">
                <p className="text-2xl text-[#d4af37] font-bold mb-2">You escaped in {formatElapsed(GAME_DURATION - timeLeft)}!</p>
                <p className="text-lg text-[#8c7a6b]">Time remaining for the full game: {formatElapsed(timeLeft)}</p>
              </div>

              <button 
                onClick={() => router.push('/level2')}
                className="text-xl text-[#0a0705] bg-[#d4af37] hover:bg-[#e5d8b3] transition-colors font-cinzel font-bold px-8 py-4 rounded uppercase tracking-widest animate-pulse"
              >
                Proceed to Level 2
              </button>
           </div>
        </div>
      )}

      {isGameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/80 backdrop-blur-lg animate-in fade-in duration-500">
           <div className="p-12 border-2 border-red-800 bg-black/90 text-center rounded shadow-[0_0_150px_rgba(200,0,0,0.6)] max-w-lg flex flex-col items-center">
              <h1 className="text-6xl font-cinzel font-bold text-red-500 mb-6 drop-shadow-[0_0_20px_red]">
                {gameOverReason === "time" ? "Time's Up" : "Game Over"}
              </h1>
              <p className="text-2xl text-red-300 mb-8 font-cormorant leading-relaxed">
                {gameOverReason === "time" 
                  ? "The countdown has reached zero. The doors seal shut forever. Restarting timeline..."
                  : "The mechanism has locked up due to too many errors. The puzzle resets..."}
              </p>
           </div>
        </div>
      )}

    </main>
  );
}
