"use client";

import { useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

interface PuzzleState {
  level: number;
  state: any;
  player_id: string;
  username: string;
  timestamp: string;
}

/**
 * Hook pentru sincronizare real-time a stării puzzle-urilor pe nivelele 2+
 * Exemplu de utilizare în Level2, Level3, etc
 */
export function useMultiplayer(roomCode: string | null, level: number) {
  
  // Broadcast state changes to room
  const broadcastPuzzleState = useCallback(
    async (state: any) => {
      if (!roomCode) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || "guest_" + Math.random().toString(36).substring(2, 9);

        const { data: player } = await supabase
          .from("player")
          .select("username")
          .eq("id", userId)
          .single();

        const username = player?.username || localStorage.getItem("escapeRoomUsername") || "Explorer";

        // Insert into puzzle_states for real-time sync
        await supabase.from("puzzle_states").insert([
          {
            room_code: roomCode,
            level: level,
            state: state,
            player_id: userId,
            username: username,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (error) {
        console.error("Failed to broadcast puzzle state:", error);
      }
    },
    [roomCode, level]
  );

  // Listen for remote state updates
  const onRemoteStateUpdate = useCallback(
    (callback: (update: PuzzleState) => void) => {
      if (!roomCode) return;

      const channel = supabase.channel(`room:${roomCode}:level${level}:puzzles`);

      const subscription = channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "puzzle_states",
            filter: `room_code=eq.${roomCode},level=eq.${level}`,
          },
          (payload) => {
            const update = payload.new as any;
            callback({
              level: update.level,
              state: update.state,
              player_id: update.player_id,
              username: update.username,
              timestamp: update.created_at,
            });
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    },
    [roomCode, level]
  );

  return { broadcastPuzzleState, onRemoteStateUpdate };
}

/**
 * Hook para combination lock synchronization
 * Used by Level 2
 */
export function useCombinationLockSync(roomCode: string | null) {
  
  const broadcastLockAttempt = useCallback(
    async (combination: number[], isCorrect: boolean) => {
      if (!roomCode) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || "guest_" + Math.random().toString(36).substring(2, 9);

        const { data: player } = await supabase
          .from("player")
          .select("username")
          .eq("id", userId)
          .single();

        const username = player?.username || localStorage.getItem("escapeRoomUsername") || "Explorer";

        await supabase.from("player_actions").insert([
          {
            room_code: roomCode,
            level: 2,
            action: isCorrect ? "lock_unlocked" : "lock_attempt",
            details: { combination, isCorrect },
            player_id: userId,
            username: username,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (error) {
        console.error("Failed to broadcast lock attempt:", error);
      }
    },
    [roomCode]
  );

  return { broadcastLockAttempt };
}

/**
 * Hook for item collection sync
 * Any level can use this when items are collected
 */
export function useItemSync(roomCode: string | null, level: number) {
  
  const broadcastItemCollection = useCallback(
    async (itemId: string, itemName: string) => {
      if (!roomCode) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || "guest_" + Math.random().toString(36).substring(2, 9);

        const { data: player } = await supabase
          .from("player")
          .select("username")
          .eq("id", userId)
          .single();

        const username = player?.username || localStorage.getItem("escapeRoomUsername") || "Explorer";

        await supabase.from("player_actions").insert([
          {
            room_code: roomCode,
            level: level,
            action: "item_collected",
            details: { itemId, itemName },
            player_id: userId,
            username: username,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (error) {
        console.error("Failed to broadcast item collection:", error);
      }
    },
    [roomCode, level]
  );

  return { broadcastItemCollection };
}
