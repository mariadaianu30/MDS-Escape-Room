"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for real-time multiplayer sync
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_KEY || ""
);

export type InventoryItem = {
  id: string;
  name: string;
  description: string;
  iconSrc?: string; // Image fallback
  emojiFallback?: string;
};

export type PlayerRole = "scribe" | "artisan" | "oracle";

interface InventoryContextType {
  items: InventoryItem[];
  addItem: (item: InventoryItem) => void;
  removeItem: (id: string) => void;
  hasItem: (id: string) => boolean;
  clearInventory: () => void;
  equippedItem: string | null;
  setEquippedItem: (id: string | null) => void;
  roomCode: string | null;
  setRoomCode: (code: string | null) => void;
  currentRole: PlayerRole;
  setCurrentRole: (role: PlayerRole) => void;
  broadcastRoomEvent: (event: string, payload: any) => void;
  onRoomEvent: (event: string, callback: (payload: any) => void) => () => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [equippedItem, setEquippedItem] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [currentRole, setCurrentRoleState] = useState<PlayerRole>("scribe");
  const [isLoaded, setIsLoaded] = useState(false);
  const [username, setUsername] = useState<string>("Explorer");
  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);
  
  // Unique client identity to prevent circular broadcast loops
  const clientIdRef = useRef<string>("");
  const listenersRef = useRef<Record<string, Function[]>>({});

  useEffect(() => {
    clientIdRef.current = "client_" + Math.random().toString(36).substring(2, 11);
  }, []);

  // Fetch logged-in user profile or email fallback
  useEffect(() => {
    async function fetchUsername() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: player } = await supabase
            .from('player')
            .select('username')
            .eq('id', session.user.id)
            .single();
          if (player?.username) {
            setUsername(player.username);
            localStorage.setItem("escapeRoomUsername", player.username);
          } else if (session.user.user_metadata?.full_name) {
            setUsername(session.user.user_metadata.full_name);
          } else if (session.user.email) {
            setUsername(session.user.email.split('@')[0]);
          }
        }
      } catch (e) {
        console.error("Failed to fetch username in InventoryProvider", e);
      }
    }
    fetchUsername();

    const saved = localStorage.getItem("escapeRoomUsername");
    if (saved) {
      setUsername(saved);
    }
  }, []);

  const addToast = (message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Load inventory and room code from persistent storage on mount
  useEffect(() => {
    const savedInventory = localStorage.getItem("escapeRoomInventory");
    if (savedInventory) {
      try {
        setItems(JSON.parse(savedInventory));
      } catch (e) {
        console.error("Failed to parse inventory", e);
      }
    }

    const savedRoomCode = localStorage.getItem("escapeRoomRoomCode");
    if (savedRoomCode) {
      setRoomCode(savedRoomCode);
    }

    const savedRole = localStorage.getItem("escapeRoomPlayerRole") as PlayerRole | null;
    if (savedRole && ["scribe", "artisan", "oracle"].includes(savedRole)) {
      setCurrentRoleState(savedRole);
    }
    
    setIsLoaded(true);
  }, []);

  // Save to persistent storage when items change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("escapeRoomInventory", JSON.stringify(items));
    }
  }, [items, isLoaded]);

  // Save to persistent storage when room code changes
  useEffect(() => {
    if (isLoaded) {
      if (roomCode) {
        localStorage.setItem("escapeRoomRoomCode", roomCode);
      } else {
        localStorage.removeItem("escapeRoomRoomCode");
      }
    }
  }, [roomCode, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("escapeRoomPlayerRole", currentRole);
    }
  }, [currentRole, isLoaded]);

  // Real-time Supabase subscription channel reference
  const channelRef = useRef<any>(null);

  // Synchronize inventory items across the shared session
  useEffect(() => {
    if (!roomCode || !isLoaded) return;

    console.log(`[Multiplayer Inventory] Connecting to room: ${roomCode}`);
    
    // Subscribe to multiplayer room channel
    const channel = supabase.channel(`room-inventory-${roomCode}`, {
      config: {
        broadcast: { self: false }
      }
    });

    channel
      .on("broadcast", { event: "inventory_sync" }, ({ payload }) => {
        if (!payload || payload.senderId === clientIdRef.current) return;
        
        console.log(`[Multiplayer Inventory] Broadcast received:`, payload);
        const name = payload.senderName || "A teammate";

        if (payload.action === "ADD_ITEM") {
          setItems((prev) => {
            if (prev.some((i) => i.id === payload.item.id)) return prev;
            return [...prev, payload.item];
          });
          addToast(`${name} picked up ${payload.item.name}!`);
        } else if (payload.action === "REMOVE_ITEM") {
          setItems((prev) => prev.filter((i) => i.id !== payload.itemId));
          addToast(`${name} used ${payload.itemName}!`);
        } else if (payload.action === "CLEAR_INVENTORY") {
          setItems([]);
          setEquippedItem(null);
          addToast(`${name} cleared the shared inventory!`);
        }
      })
      .on("broadcast", { event: "room_event" }, ({ payload }) => {
        if (!payload || payload.senderId === clientIdRef.current) return;
        
        console.log(`[Multiplayer Room Event] Broadcast received: ${payload.event}`, payload.payload);
        if (payload.event === "ROLE_ASSIGNED" && payload.payload?.role && payload.payload?.playerName) {
          addToast(`${payload.payload.playerName} is now ${payload.payload.role}.`);
        }
        const callbacks = listenersRef.current[payload.event] || [];
        callbacks.forEach((cb) => cb(payload.payload));
      })
      .subscribe((status) => {
        console.log(`[Multiplayer Inventory] Channel status for ${roomCode}: ${status}`);
      });

    channelRef.current = channel;

    return () => {
      console.log(`[Multiplayer Inventory] Disconnecting from room: ${roomCode}`);
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomCode, isLoaded]);

  const addItem = (item: InventoryItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });

    // Broadcast collection event to teammates
    if (channelRef.current) {
      console.log(`[Multiplayer Inventory] Broadcasting ADD_ITEM: ${item.name}`);
      channelRef.current.send({
        type: "broadcast",
        event: "inventory_sync",
        payload: {
          action: "ADD_ITEM",
          item,
          senderId: clientIdRef.current,
          senderName: username
        }
      });
    }
  };

  const removeItem = (id: string) => {
    const item = items.find(i => i.id === id);
    const itemName = item ? item.name : "an item";
    if (equippedItem === id) setEquippedItem(null);
    setItems((prev) => prev.filter((i) => i.id !== id));

    // Broadcast discard/use event to teammates
    if (channelRef.current) {
      console.log(`[Multiplayer Inventory] Broadcasting REMOVE_ITEM: ${id}`);
      channelRef.current.send({
        type: "broadcast",
        event: "inventory_sync",
        payload: {
          action: "REMOVE_ITEM",
          itemId: id,
          itemName,
          senderId: clientIdRef.current,
          senderName: username
        }
      });
    }
  };

  const hasItem = (id: string) => {
    return items.some((i) => i.id === id);
  };

  const clearInventory = () => {
    setItems([]);
    setEquippedItem(null);
    localStorage.removeItem("escapeRoomInventory");

    // Broadcast clear event to teammates
    if (channelRef.current) {
      console.log(`[Multiplayer Inventory] Broadcasting CLEAR_INVENTORY`);
      channelRef.current.send({
        type: "broadcast",
        event: "inventory_sync",
        payload: {
          action: "CLEAR_INVENTORY",
          senderId: clientIdRef.current,
          senderName: username
        }
      });
    }
  };

  const broadcastRoomEvent = (event: string, payload: any) => {
    if (channelRef.current) {
      console.log(`[Multiplayer Room Event] Broadcasting event: ${event}`, payload);
      channelRef.current.send({
        type: "broadcast",
        event: "room_event",
        payload: {
          event,
          payload,
          senderId: clientIdRef.current
        }
      });
    }
  };

  const setCurrentRole = (role: PlayerRole) => {
    setCurrentRoleState(role);
    localStorage.setItem("escapeRoomPlayerRole", role);
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "room_event",
        payload: {
          event: "ROLE_ASSIGNED",
          payload: {
            role,
            playerName: username,
          },
          senderId: clientIdRef.current,
        },
      });
    }
  };

  const onRoomEvent = (event: string, callback: (payload: any) => void) => {
    if (!listenersRef.current[event]) {
      listenersRef.current[event] = [];
    }
    listenersRef.current[event].push(callback);
    return () => {
      listenersRef.current[event] = listenersRef.current[event].filter(cb => cb !== callback);
    };
  };

  return (
    <InventoryContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        hasItem,
        clearInventory,
        equippedItem,
        setEquippedItem,
        roomCode,
        setRoomCode,
        currentRole,
        setCurrentRole,
        broadcastRoomEvent,
        onRoomEvent
      }}
    >
      {children}
      {toasts.length > 0 && (
        <div className="fixed bottom-24 right-4 z-[9999] flex flex-col gap-3 pointer-events-none select-none">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="bg-[#150e09]/95 border-2 border-[#d4af37] text-[#e5d8b3] px-5 py-3 rounded-lg shadow-[0_0_20px_rgba(212,175,55,0.4)] animate-in fade-in slide-in-from-bottom-5 duration-300 font-cinzel text-xs tracking-wider border-t-4 border-t-[#d4af37] w-64 text-center border-l-2 border-r-2"
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
}
