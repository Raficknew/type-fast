"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MAX_ROUNDS } from "@/gameSettings";
import { supabaseServer as supabase } from "@/lib/db";
import { getRandomSentence, getRoundEndTime } from "@/lib/pure";

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

  if (error) {
    throw new Error(error.message);
  }

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

  if (data.round < MAX_ROUNDS - 1) {
    throw new Error("Race has not ended yet");
  }

  const { error } = await supabase.from("race").delete().eq("id", raceId);

  if (error) {
    throw new Error("Failed to delete race");
  }

  revalidatePath("/");
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

  if (playersError) {
    throw new Error(playersError.message);
  }

  const roundExpired = new Date(race.end_time).getTime() <= Date.now();
  const allPlayersFinished =
    (players?.length ?? 0) > 0 &&
    players.every((player) => player.live_progress === "FINISHED");

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

  if (updateError) {
    throw new Error(updateError.message);
  }

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
