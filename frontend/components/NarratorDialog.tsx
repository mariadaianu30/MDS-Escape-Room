"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { BookOpen, Loader2, X } from "lucide-react";

const LEVEL_TARGETS: Record<number, string> = {
  1: "library",
  2: "alchemy_lab",
  3: "observatory",
  4: "crypt",
  5: "final_chamber",
};

export default function NarratorDialog() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const currentLevel = useMemo(() => {
    const match = pathname.match(/level(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }, [pathname]);

  if (!currentLevel) return null;

  const askNarrator = async () => {
    setIsOpen(true);
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: currentLevel,
          targetId: LEVEL_TARGETS[currentLevel] || "default",
          state: {
            completedLevel: Number(localStorage.getItem("escapeRoomCompletedLevel") || "0"),
          },
        }),
      });

      if (!response.ok) throw new Error("Narrator request failed");

      const data = await response.json();
      setDescription(data.description || "The narrator studies the room, but says nothing yet.");
    } catch {
      setError("The narrator is silent for a moment. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={askNarrator}
        className="fixed bottom-24 right-4 lg:bottom-8 lg:right-6 z-[60] flex items-center justify-center rounded-full border-2 border-[#5c4026] bg-black/80 p-3 text-[#c7baaa] shadow-[0_0_15px_black] transition-all hover:border-[#d4af37] hover:text-[#d4af37]"
        title="Ask the Narrator"
      >
        <BookOpen size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-xl rounded-lg border-2 border-[#5c4026] bg-[#0f0a07] p-6 shadow-[0_0_40px_rgba(0,0,0,0.9)]">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-[#8c7a6b] transition-colors hover:text-[#d4af37]"
              title="Close"
            >
              <X size={22} />
            </button>

            <div className="mb-5 flex items-center gap-3 border-b border-[#5c4026] pb-4">
              <BookOpen className="text-[#d4af37]" size={26} />
              <div>
                <h2 className="font-cinzel text-xl uppercase tracking-[0.25em] text-[#d4af37]">Narrator</h2>
                <p className="font-cormorant text-sm italic text-[#8c7a6b]">Atmospheric room inspection</p>
              </div>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center gap-3 py-12 text-[#d4af37]">
                <Loader2 className="animate-spin" size={24} />
                <span className="font-cinzel text-xs uppercase tracking-[0.25em]">Listening to the room...</span>
              </div>
            ) : error ? (
              <p className="font-cormorant text-xl italic leading-relaxed text-red-300">{error}</p>
            ) : (
              <p className="font-cormorant text-xl italic leading-relaxed text-[#e5d8b3]">
                {description}
              </p>
            )}

            <button
              onClick={askNarrator}
              disabled={isLoading}
              className="mt-6 w-full rounded-lg border border-[#d4af37]/60 px-5 py-3 font-cinzel text-xs uppercase tracking-[0.25em] text-[#d4af37] transition-colors hover:bg-[#d4af37] hover:text-black disabled:opacity-50"
            >
              Ask Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}
