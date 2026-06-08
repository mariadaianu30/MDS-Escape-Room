"use client";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_KEY || ""
);

export const GAME_DURATION_SECONDS = 30 * 60;

export function getRemainingRunSeconds() {
  const endTime = parseInt(localStorage.getItem("escapeRoomEndTime") || "0", 10);
  if (!endTime) return GAME_DURATION_SECONDS;
  return Math.max(0, Math.floor((endTime - Date.now()) / 1000));
}

export async function saveAccountProgress(currentLevel: number, remainingTime = getRemainingRunSeconds()) {
  if (localStorage.getItem("escapeRoomGuestMode") === "1") return;

  const { data } = await supabase.auth.getUser();
  if (!data.user) return;

  // Fetch current best_score
  const { data: player } = await supabase
    .from("player")
    .select("best_score")
    .eq("id", data.user.id)
    .maybeSingle();

  const completedChambers = currentLevel - 1;
  const score = completedChambers > 0 ? (completedChambers * 1000 + Math.max(0, remainingTime) * 2) : 0;
  const bestScore = Math.max(player?.best_score || 0, score);

  const { error } = await supabase
    .from("player")
    .update({
      current_level: currentLevel,
      remaining_time: Math.max(0, remainingTime),
      best_score: bestScore
    })
    .eq("id", data.user.id);

  if (error) {
    console.error("Failed to save account progress:", error);
  }
}
