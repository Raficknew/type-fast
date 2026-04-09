"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MAX_ROUNDS } from "@/gameSettings";
import { supabaseServer as supabase } from "@/lib/db";
import { assertNoSupabaseError } from "@/lib/permissions";
import { getRandomSentence, getRoundEndTime, isStaleRace } from "@/lib/pure";
import { assertRaceEnded } from "../permissions/race";

export const createRace = async () => {
  const { data: existingRaces } = await supabase
    .from("race")
    .select("id")
    .limit(1);

  if (existingRaces && existingRaces.length > 0) {
    revalidatePath("/");
    return;
  }

  const randomSentence = await getRandomSentence();
  const newRoundEndTime = await getRoundEndTime();

  const { error } = await supabase.from("race").insert({
    sentence: randomSentence,
    end_time: newRoundEndTime,
  });

  assertNoSupabaseError(error);

  revalidatePath("/");
};

export const deleteRace = async (raceId: string) => {
  const { data, error: fetchError } = await supabase
    .from("race")
    .select("round")
    .eq("id", raceId)
    .single();

  if (fetchError || !data) {
    revalidatePath("/");
    return;
  }

  assertRaceEnded(data, MAX_ROUNDS);

  const { error } = await supabase.from("race").delete().eq("id", raceId);
  assertNoSupabaseError(error);

  revalidatePath("/");
};

export const deleteRaceIfStale = async (raceId: string) => {
  const { data: race, error: fetchError } = await supabase
    .from("race")
    .select("end_time")
    .eq("id", raceId)
    .single();

  if (fetchError || !race || !isStaleRace(race.end_time)) {
    return false;
  }

  const { error } = await supabase
    .from("race")
    .delete()
    .eq("id", raceId)
    .eq("end_time", race.end_time);

  assertNoSupabaseError(error);

  return true;
};

export const restartRace = async (raceId: string, currentRound: number) => {
  if (currentRound >= MAX_ROUNDS) {
    return { status: "race_ended" as const };
  }

  const { data: race, error: raceError } = await supabase
    .from("race")
    .select("end_time")
    .eq("id", raceId)
    .eq("round", currentRound)
    .single();

  if (raceError || !race) {
    return { status: "out_of_date" as const };
  }

  const { data: players, error: playersError } = await supabase
    .from("player_stats")
    .select("live_progress")
    .eq("race_id", raceId)
    .eq("round", currentRound);

  assertNoSupabaseError(playersError);

  const racePlayers = players ?? [];

  const roundExpired = new Date(race.end_time).getTime() <= Date.now();
  const allPlayersFinished =
    racePlayers.length > 0 &&
    racePlayers.every((player) => player.live_progress === "FINISHED");

  if (!roundExpired && !allPlayersFinished) {
    return { status: "not_ready" as const };
  }

  const newSentence = getRandomSentence();
  const newRoundEndTime = getRoundEndTime();

  const { data: updatedRace, error: updateError } = await supabase
    .from("race")
    .update({
      sentence: newSentence,
      end_time: newRoundEndTime,
      round: currentRound + 1,
    })
    .eq("id", raceId)
    .eq("round", currentRound)
    .select("id")
    .maybeSingle();

  assertNoSupabaseError(updateError);

  if (!updatedRace) {
    return { status: "out_of_date" as const };
  }

  return { status: "advanced" as const };
};

export const getRace = async (raceId?: string) => {
  let query = supabase.from("race").select();

  if (raceId) {
    query = query.eq("id", raceId);
  } else {
    query = query.limit(1);
  }

  const { data, error } = await query.single();
  if (error) {
    redirect("/");
  }
  return data;
};
