"use client";

import { usePathname, useRouter } from "next/navigation";
import { LogOut, XCircle } from "lucide-react";
import { useTimer } from "@/lib/TimerContext";
import { useInventory } from "@/lib/InventoryContext";

export default function SaveAndExit() {
  const pathname = usePathname();
  const router = useRouter();
  const { isGameOver, timeLeft, syncGameProgress } = useTimer();
  const { roomCode, setRoomCode, clearInventory } = useInventory();

  // Only show on level pages
  if (!pathname || !pathname.startsWith('/level')) return null;
  // Don't show if game over
  if (isGameOver) return null;

  const handleExit = async () => {
    // Multiplayer or Single player: Ensure we sync the exact timer progress immediately to DB
    await syncGameProgress(timeLeft);
    localStorage.setItem("escapeRoomTimeLeft", String(timeLeft));
    // Remove EndTime to ensure when we resume it uses TimeLeft
    localStorage.removeItem("escapeRoomEndTime");
    
    if (roomCode) {
      setRoomCode(null);
    }
    router.push("/lobby");
  };

  return (
    <button
      onClick={handleExit}
      className="fixed top-[5.5rem] right-4 bg-black/80 border-2 border-[#5c4026] text-[#c7baaa] hover:text-[#d4af37] hover:border-[#d4af37] px-4 py-2 rounded-lg font-cinzel text-xs md:text-sm uppercase tracking-widest backdrop-blur-sm z-[60] shadow-[0_0_15px_black] transition-all flex items-center gap-2 group"
      title={roomCode ? "Exit to Lobby" : "Save and Exit to Lobby"}
    >
      {roomCode ? (
        <>
          <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline">Exit</span>
        </>
      ) : (
        <>
          <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
          <span className="hidden sm:inline">Save & Exit</span>
        </>
      )}
    </button>
  );
}
