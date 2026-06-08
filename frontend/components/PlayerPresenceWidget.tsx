"use client";

import { useState, useEffect } from "react";
import { Users, Eye, Hand, Zap } from "lucide-react";
import { useInventory } from "@/lib/InventoryContext";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

interface PlayerPresence {
  id: string;
  username: string;
  role: "scribe" | "artisan" | "oracle";
  status: string;
  last_seen: string;
  is_online: boolean;
}

const RoleIcon = ({ role }: { role: string }) => {
  switch (role) {
    case "scribe":
      return <Eye size={16} className="text-blue-400" />;
    case "artisan":
      return <Hand size={16} className="text-amber-400" />;
    case "oracle":
      return <Zap size={16} className="text-purple-400" />;
    default:
      return null;
  }
};

export default function PlayerPresenceWidget() {
  const { roomCode, currentRole } = useInventory();
  const [players, setPlayers] = useState<PlayerPresence[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!roomCode) {
      setPlayers([]);
      return;
    }

    const channelName = `presence-room-${roomCode}`;
    const channel = supabase.channel(channelName);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const playersList: any[] = [];
        
        Object.keys(state).forEach((key) => {
          const presences = state[key] as any[];
          presences.forEach((p) => {
            playersList.push({
              id: p.id,
              username: p.username || "Explorer",
              role: p.role || "scribe",
              is_online: true
            });
          });
        });
        
        const uniquePlayers = playersList.filter((p, index, self) => 
          self.findIndex((pl) => pl.id === p.id) === index
        );
        
        setPlayers(uniquePlayers);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          const { data: { session } } = await supabase.auth.getSession();
          const myId = session?.user?.id || "guest_" + Math.random().toString(36).substring(2, 9);
          setUserId(myId);
          
          const myUsername = localStorage.getItem("escapeRoomUsername") || "Explorer";

          await channel.track({
            id: myId,
            username: myUsername,
            role: currentRole || "scribe"
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [roomCode, currentRole]);

  if (!roomCode) return null;

  return (
    <div className="fixed top-4 left-[145px] z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 group text-[#c7baaa] hover:text-[#d4af37] transition-all bg-black/70 px-4 py-2 uppercase tracking-widest text-xs font-cinzel border border-[#5c4026]/60 rounded-lg hover:border-[#d4af37] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] backdrop-blur-xl active:scale-95"
      >
        <Users size={14} className="text-[#d4af37]" />
        <span>Team ({players.length})</span>
      </button>

      {isOpen && (
        <div className="absolute top-12 left-0 w-72 bg-[#110b07]/95 border-2 border-[#d4af37]/60 rounded-lg p-4 backdrop-blur-xl shadow-[0_0_40px_rgba(212,175,55,0.4)] bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-[#5c4026] pb-2 mb-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-[#d4af37]" />
              <h3 className="font-cinzel text-xs uppercase tracking-widest text-[#d4af37] font-bold">
                Chamber Team
              </h3>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#8c7a6b] hover:text-[#d4af37] text-xs font-bold font-cinzel transition-colors"
            >
              X
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center gap-2 px-3 py-2 rounded border-l-2 text-xs transition-all ${
                  player.id === userId
                    ? "border-[#d4af37] bg-[#d4af37]/10"
                    : player.is_online
                    ? "border-green-500 bg-green-950/20"
                    : "border-gray-500 bg-gray-950/20"
                }`}
              >
                <RoleIcon role={player.role} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#e5d8b3] truncate">
                    {player.username}
                    {player.id === userId && (
                      <span className="text-[#d4af37] ml-1 text-[10px] uppercase tracking-wider font-normal">
                        (You)
                      </span>
                    )}
                  </div>
                  <div className="text-[#8c7a6b] text-[10px] capitalize">
                    {player.role}
                    {player.is_online && (
                      <span className="text-green-400 ml-1">● Online</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
