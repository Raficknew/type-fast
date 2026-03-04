"use server";

import { MAX_ROUNDS } from "@/gameSettings";
import { supabase } from "@/lib/db";
import { getRandomSentence, getRoundEndTime } from "@/lib/pure";
import { revalidatePath } from "next/cache";

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
    round: 0,
    end_time: newRoundEndTime,
  });

  if (error) {
    throw new Error("Failed to create race");
  }

  revalidatePath("/");
};

export const deleteRace = async (raceId: string) => {
  // Only delete if the race has actually reached MAX_ROUNDS.
  const { data, error: fetchError } = await supabase
    .from("race")
    .select("round")
    .eq("id", raceId)
    .single();

  if (fetchError || !data) {
    throw new Error("Race not found");
  }

  if (data.round < MAX_ROUNDS) {
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
    throw new Error("Race has already ended");
  }

  const newSentence = getRandomSentence();
  const newRoundEndTime = getRoundEndTime();

  await supabase
    .from("race")
    .update({
      sentence: newSentence,
      end_time: newRoundEndTime,
      round: currentRound + 1,
    })
    .eq("id", raceId)
    .eq("round", currentRound);
};
