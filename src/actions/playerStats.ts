"use server";

import { supabaseServer as supabase } from "@/lib/db";

export const ensurePlayerRow = async (
  raceId: string,
  userId: string,
  displayName: string,
): Promise<number | null> => {
  const { data: existing } = await supabase
    .from("player_stats")
    .select("wpm")
    .eq("user_id", userId)
    .eq("race_id", raceId)
    .maybeSingle();

  if (existing) {
    return existing.wpm ?? null;
  }

  await supabase.from("player_stats").insert({
    name: displayName,
    race_id: raceId,
    user_id: userId,
  });

  return null;
};

export const updatePlayerLiveStats = async (
  raceId: string,
  userId: string,
  wpm: number,
  accuracy: number,
  liveProgress: string,
): Promise<void> => {
  await supabase
    .from("player_stats")
    .update({ wpm, accuracy, live_progress: liveProgress })
    .eq("user_id", userId)
    .eq("race_id", raceId);
};
