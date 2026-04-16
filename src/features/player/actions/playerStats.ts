"use server";

import { supabaseServer as supabase } from "@/lib/db";
import { assertNoSupabaseError } from "@/lib/permissions";
import type { PlayerStat } from "@/types/types";
import {
  assertAuthenticatedUser,
  assertMissingConflictConstraintError,
} from "../permissions/player";

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

  assertNoSupabaseError(error);

  return data ?? [];
};

export const ensurePlayerRoundRow = async (
  raceId: string,
  userId: string,
  accessToken: string,
  displayName: string,
  round: number,
): Promise<Omit<PlayerStat, "id" | "name"> | null> => {
  await assertAuthenticatedUser(userId, accessToken);

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
    assertMissingConflictConstraintError(upsertError);

    const { data: existingRow, error: existingRowError } = await supabase
      .from("player_stats")
      .select("wpm")
      .eq("user_id", userId)
      .eq("race_id", raceId)
      .eq("round", round)
      .maybeSingle();

    assertNoSupabaseError(existingRowError);

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
        assertNoSupabaseError(insertError);
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

  assertNoSupabaseError(fetchError);

  return {
    wpm: row?.wpm,
    user_id: userId,
    accuracy: row?.accuracy ?? null,
    live_progress: row?.live_progress ?? null,
    round: row?.round ?? null,
  };
};

export const updatePlayerLiveStats = async (
  raceId: string,
  userId: string,
  accessToken: string,
  round: number,
  wpm: number,
  accuracy: number,
  liveProgress: string,
): Promise<void> => {
  await assertAuthenticatedUser(userId, accessToken);

  const safeWpm = Number.isFinite(wpm) ? Math.max(0, Math.round(wpm)) : 0;
  const safeAccuracy = Number.isFinite(accuracy)
    ? Math.min(100, Math.max(0, Math.round(accuracy)))
    : 0;

  await supabase
    .from("player_stats")
    .update({
      wpm: safeWpm,
      accuracy: safeAccuracy,
      live_progress: liveProgress,
    })
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

  assertNoSupabaseError(error);

  return data ?? [];
};

export const updateCurrentRacePlayerName = async (
  userId: string,
  accessToken: string,
  displayName: string,
): Promise<void> => {
  await assertAuthenticatedUser(userId, accessToken);

  const { data: activeRace, error: raceError } = await supabase
    .from("race")
    .select("id")
    .limit(1)
    .maybeSingle();

  assertNoSupabaseError(raceError);

  if (!activeRace) {
    return;
  }

  const { error: updateError } = await supabase
    .from("player_stats")
    .update({ name: displayName })
    .eq("race_id", activeRace.id)
    .eq("user_id", userId);

  assertNoSupabaseError(updateError);
};
