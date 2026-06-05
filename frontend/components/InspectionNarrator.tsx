"use client";

import { useState } from "react";
import { X, Search } from "lucide-react";
import { useInventory } from "@/lib/InventoryContext";

type InspectableObject = {
  id: string;
  label: string;
  level: number;
  state?: Record<string, unknown>;
};

type InspectionNarratorProps = {
  objects: InspectableObject[];
};

export function InspectionNarrator({ objects }: InspectionNarratorProps) {
  const { roomCode } = useInventory();
  const [active, setActive] = useState<InspectableObject | null>(null);
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  if (!roomCode) return null;

  const inspect = async (object: InspectableObject) => {
    setActive(object);
    setDescription("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId: object.id,
          level: object.level,
          state: object.state ?? {},
        }),
      });

      const data = await res.json();
      setDescription(data.description ?? "The room refuses to explain itself.");
    } catch {
      setDescription("The narrator's voice fades, leaving only dust and silence.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-24 left-4 z-[70] flex max-w-[220px] flex-col gap-2 font-cinzel">
        {objects.map((object) => (
          <button
            key={object.id}
            onClick={() => inspect(object)}
            className="group flex items-center gap-2 rounded-full border border-[#5c4026]/70 bg-black/70 px-4 py-2 text-left text-[10px] uppercase tracking-[0.18em] text-[#c7baaa] shadow-[0_0_18px_rgba(0,0,0,0.65)] backdrop-blur transition hover:border-[#d4af37] hover:text-[#d4af37]"
            title={`Inspect ${object.label}`}
          >
            <Search size={14} className="shrink-0 transition group-hover:scale-110" />
            <span className="truncate">{object.label}</span>
          </button>
        ))}
      </div>

      {active && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 font-cormorant">
          <button
            className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm"
            onClick={() => setActive(null)}
            aria-label="Close inspection"
          />
          <section className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-[#d4af37]/35 bg-[#15100b] p-8 text-[#e5d8b3] shadow-[0_35px_110px_rgba(0,0,0,0.9),inset_0_0_55px_rgba(212,175,55,0.06)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(212,175,55,0.16),transparent_36%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_34%,rgba(0,0,0,0.26))]" />
            <div className="relative">
              <div className="mb-5 flex items-start justify-between gap-4 border-b border-[#5c4026]/60 pb-4">
                <div>
                  <p className="font-cinzel text-[10px] uppercase tracking-[0.34em] text-[#d4af37]/70">Narrator Inspection</p>
                  <h3 className="mt-2 font-cinzel text-2xl uppercase tracking-[0.14em] text-[#f1dfb8]">{active.label}</h3>
                </div>
                <button
                  onClick={() => setActive(null)}
                  className="rounded-full border border-[#5c4026]/70 bg-black/40 p-2 text-[#8c7a6b] transition hover:border-red-500/60 hover:text-red-300"
                  aria-label="Close inspection"
                >
                  <X size={18} />
                </button>
              </div>

              {isLoading ? (
                <div className="flex min-h-28 items-center justify-center gap-2 text-[#8c7a6b]">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#d4af37]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#d4af37]" style={{ animationDelay: "0.15s" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#d4af37]" style={{ animationDelay: "0.3s" }} />
                </div>
              ) : (
                <p className="min-h-28 font-serif text-lg italic leading-relaxed text-[#c7baaa]">
                  {description}
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
