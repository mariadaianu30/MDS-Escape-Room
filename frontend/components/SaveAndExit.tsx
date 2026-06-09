"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useTimer } from "@/lib/TimerContext";

export default function SaveAndExit() {
  const pathname = usePathname();
  const router = useRouter();
  const { isGameOver } = useTimer();

  // Only show on level pages
  if (!pathname || !pathname.startsWith('/level')) return null;
  // Don't show if game over
  if (isGameOver) return null;

  return (
    <button
      onClick={() => router.push("/lobby")}
      className="fixed top-[5.5rem] right-4 bg-black/80 border-2 border-[#5c4026] text-[#c7baaa] hover:text-[#d4af37] hover:border-[#d4af37] px-4 py-2 rounded-lg font-cinzel text-xs md:text-sm uppercase tracking-widest backdrop-blur-sm z-[60] shadow-[0_0_15px_black] transition-all flex items-center gap-2 group"
      title="Save and Exit to Lobby"
    >
      <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
      <span className="hidden sm:inline">Save & Exit</span>
    </button>
  );
}
