"use server";

import { supabase } from "@/lib/db";
import { getRandomSentence } from "@/lib/pure";
import { redirect } from "next/navigation";

export async function createRace() {
  // Check if there's already a waiting race
  const { data: existingRace } = await supabase
    .from("race")
    .select("id")
    .eq("status", "waiting")
    .limit(1)
    .single();

  if (existingRace) {
    redirect(`/race/${existingRace.id}`);
  }

  // No waiting race found, create a new one
  const { data: newRace, error } = await supabase
    .from("race")
    .insert({ sentence: getRandomSentence(), status: "waiting" })
    .select()
    .single();

  if (error || !newRace) {
    throw new Error("Failed to create race");
  }

  redirect(`/race/${newRace.id}`);
}
