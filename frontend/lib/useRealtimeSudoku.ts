"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

type Grid = number[][];

interface SudokuUpdate {
  row: number;
  col: number;
  value: number;
  player_id: string;
  username: string;
  timestamp: string;
}

export function useRealtimeSudoku(
  roomCode: string | null,
  level: number,
  onRemoteUpdate: (update: SudokuUpdate) => void
) {
  const channelRef = useRef<any>(null);

  // Broadcast sudoku update to room
  const broadcastSudokuUpdate = async (
    row: number,
    col: number,
    value: number
  ) => {
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

      // Insert into sudoku_updates table for real-time sync
      await supabase.from("sudoku_updates").insert([
        {
          room_code: roomCode,
          level: level,
          row: row,
          col: col,
          value: value,
          player_id: userId,
          username: username,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Failed to broadcast sudoku update:", error);
    }
  };

  // Listen for remote updates
  useEffect(() => {
    if (!roomCode) return;

    const channel = supabase.channel(`room:${roomCode}:level${level}:sudoku`);

    const subscription = channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sudoku_updates",
          filter: `room_code=eq.${roomCode},level=eq.${level}`,
        },
        (payload) => {
          const update = payload.new as any;
          onRemoteUpdate({
            row: update.row,
            col: update.col,
            value: update.value,
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
  }, [roomCode, level, onRemoteUpdate]);

  return { broadcastSudokuUpdate };
}

// Hook for tracking player actions
export function usePlayerAction(roomCode: string | null, level: number) {
  const broadcastAction = async (action: string, details: any = {}) => {
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
          action: action,
          details: details,
          player_id: userId,
          username: username,
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Failed to broadcast action:", error);
    }
  };

  return { broadcastAction };
}
