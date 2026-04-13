"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useInventory } from "@/lib/InventoryContext";
import AIChat from "@/components/AIChat";

export default function Level3() {
  const router = useRouter();
  const { addItem, hasItem } = useInventory();
  const [constellationSolved, setConstellationSolved] = useState(false);

  const handlePickUpLens = () => {
    if (!hasItem("lens_stellar")) {
      addItem({
        id: "lens_stellar",
        name: "Stellar Lens",
        description: "A finely cut lens that seems to refract starlight in unusual patterns. It might fit perfectly into a telescope.",
        emojiFallback: "🔭"
      });
      alert("You picked up the Stellar Lens!");
    }
  };

  return (
    <main className="min-h-screen relative flex flex-col items-center justify-center bg-[#05060a] text-[#8aa1b8] font-cormorant select-none overflow-hidden pb-32">
      
      {/* Dynamic Starry Background */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center opacity-60 mix-blend-screen"
        style={{ backgroundImage: 'radial-gradient(circle at top, #1a2336 0%, #05060a 100%)' }}
      />
      <div className="absolute inset-0 z-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" />

      {/* Header */}
      <h1 className="relative z-10 text-4xl md:text-6xl font-cinzel font-bold text-[#b8d4f0] tracking-widest drop-shadow-[0_0_15px_rgba(184,212,240,0.5)] mb-8">
        Level 3 — The Astronomer's Tower
      </h1>

      {/* Interactive Hub */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col items-center justify-center p-8 border-4 border-[#2b3a53] bg-black/60 rounded-xl shadow-[0_0_50px_rgba(43,58,83,0.8)] backdrop-blur-md">
        
        <p className="text-2xl text-center mb-12 italic max-w-3xl leading-relaxed">
          The cold wind howls through the open arches. A massive bronze telescope points toward an empty void in the sky. To unlock the passage, you must align the lenses with the lost constellation.
        </p>

        {/* Andra's Implementation Space */}
        <div className="w-full flex flex-col md:flex-row items-center justify-center gap-10">
          
          {/* Action 1: Pick up Evidence (Inventory System usage) */}
          <div className="flex flex-col items-center bg-[#111824] p-6 rounded border border-[#3b4c6b] hover:border-[#6b8bad] transition-colors cursor-pointer" onClick={handlePickUpLens}>
             <div className="text-6xl mb-4 animate-pulse">🔭</div>
             <p className="font-cinzel text-xl text-[#b8d4f0]">Inspect the Desk</p>
             {hasItem("lens_stellar") && (
                <p className="text-sm text-green-400 mt-2">Lens collected!</p>
             )}
          </div>

          {/* Action 2: Puzzle Validation */}
          <div className="flex flex-col items-center bg-[#111824] p-6 rounded border border-[#3b4c6b] relative">
             <div className="text-6xl mb-4">🌌</div>
             <p className="font-cinzel text-xl text-[#b8d4f0]">The Telescope</p>
             
             {!hasItem("lens_stellar") ? (
                <p className="text-sm text-red-400 mt-2 max-w-[200px] text-center">It lacks a focusing lens. Search the room.</p>
             ) : (
                <button 
                  className="mt-4 px-6 py-2 bg-[#2b3a53] text-[#b8d4f0] border border-[#6b8bad] rounded font-bold hover:bg-[#3b4c6b]"
                  onClick={() => setConstellationSolved(true)}
                >
                  Align Stars
                </button>
             )}
          </div>

        </div>

      </div>

      {constellationSolved && (
         <div className="relative z-10 mt-12 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <button 
              onClick={() => router.push('/level4')}
              className="text-2xl font-cinzel font-bold text-black bg-[#b8d4f0] px-12 py-4 rounded shadow-[0_0_40px_rgba(184,212,240,0.6)] uppercase tracking-widest hover:scale-105 transition-all animate-pulse"
            >
              Enter Level 4
            </button>
         </div>
      )}

      {/* AI Integration */}
      <AIChat puzzleId="astronomer_telescope" gameProgress={constellationSolved ? "Telescope aligned" : "Searching for lenses"} />

    </main>
  );
}
