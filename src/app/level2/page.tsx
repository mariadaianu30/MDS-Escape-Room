"use client";

import { useRouter } from "next/navigation";

export default function Level2Placeholder() {
  const router = useRouter();

  return (
    <main className="min-h-screen flex flex-col justify-center items-center bg-[#0a0705] text-[#d4af37] font-cormorant">
      <h1 className="text-6xl font-cinzel font-bold mb-8">Level 2</h1>
      <h2 className="text-4xl text-[#a89f91] mb-12 uppercase tracking-widest">Under Construction</h2>
      
      <p className="text-xl max-w-lg text-center mb-12">
        The corridor falls dark. The ancient architects are currently forging the puzzle mechanisms for this chamber. Return shortly!
      </p>

      <button 
         onClick={() => router.push("/")}
         className="px-8 py-3 border border-[#d4af37] rounded hover:bg-[#d4af37] hover:text-[#0a0705] transition-colors uppercase tracking-widest"
      >
         Return to Hub
      </button>
    </main>
  );
}
