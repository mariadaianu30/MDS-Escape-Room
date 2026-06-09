"use client";

import { useInventory } from "@/lib/InventoryContext";
import { usePathname } from "next/navigation";
import ChatWidget from "@/components/ChatWidget";
import PlayerPresenceWidget from "@/components/PlayerPresenceWidget";

export default function GlobalMultiplayerWidgets() {
  const { roomCode } = useInventory();
  const pathname = usePathname();

  // Only render on level pages (e.g. /level1, /level2) and if in a multiplayer room
  if (!roomCode || !pathname || !pathname.startsWith("/level")) {
    return null;
  }

  return (
    <>
      <ChatWidget />
      <PlayerPresenceWidget />
    </>
  );
}
