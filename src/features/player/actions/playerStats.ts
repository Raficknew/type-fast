"use server";

import { supabaseServer as supabase } from "@/lib/db";
import type { PlayerStat } from "@/types/types";

export const getPlayerStats = async (
  raceId: string,
  round: number,
): Promise<PlayerStat[]> => {
  const { data, error } = await supabase
    .from("player_stats")
    .select("*")
    .eq("race_id", raceId)
    .eq("round", round)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};

export const ensurePlayerRoundRow = async (
  raceId: string,
  userId: string,
  displayName: string,
  round: number,
): Promise<Omit<PlayerStat, "id" | "name"> | null> => {
  const { error: upsertError } = await supabase.from("player_stats").upsert(
    {
      name: displayName,
      race_id: raceId,
      user_id: userId,
      round,
    },
    {
      onConflict: "race_id,user_id,round",
      ignoreDuplicates: true,
    },
  );

  if (upsertError) {
    const missingConflictConstraint = upsertError.message.includes(
      "no unique or exclusion constraint matching the ON CONFLICT specification",
    );

    if (!missingConflictConstraint) {
      throw new Error(upsertError.message);
    }

    const { data: existingRow, error: existingRowError } = await supabase
      .from("player_stats")
      .select("wpm")
      .eq("user_id", userId)
      .eq("race_id", raceId)
      .eq("round", round)
      .maybeSingle();

    if (existingRowError) {
      throw new Error(existingRowError.message);
    }

    if (!existingRow) {
      const { error: insertError } = await supabase
        .from("player_stats")
        .insert({
          name: displayName,
          race_id: raceId,
          user_id: userId,
          round,
        });

      if (insertError) {
        throw new Error(insertError.message);
      }
    }
  }

  const { data: row, error: fetchError } = await supabase
    .from("player_stats")
    .select("wpm, accuracy, live_progress, round")
    .eq("user_id", userId)
    .eq("race_id", raceId)
    .eq("round", round)
    .maybeSingle();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  return {
    wpm: row?.wpm,
    accuracy: row?.accuracy ?? null,
    live_progress: row?.live_progress ?? null,
    round: row?.round ?? null,
  };
};

export const updatePlayerLiveStats = async (
  raceId: string,
  userId: string,
  round: number,
  wpm: number,
  accuracy: number,
  liveProgress: string,
): Promise<void> => {
  await supabase
    .from("player_stats")
    .update({ wpm, accuracy, live_progress: liveProgress })
    .eq("user_id", userId)
    .eq("race_id", raceId)
    .eq("round", round);
};

export const getFinalPlayersStats = async (
  raceId: string,
): Promise<PlayerStat[]> => {
  const { data, error } = await supabase
    .from("player_stats")
    .select("*")
    .eq("race_id", raceId)
    .order("wpm", { ascending: false })
    .order("accuracy", { ascending: false })
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
};
