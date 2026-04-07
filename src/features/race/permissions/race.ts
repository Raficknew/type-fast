import type { RaceRoundLike } from "@/types/types";

export const assertRaceEnded = (race: RaceRoundLike, maxRounds: number) => {
  if (race.round < maxRounds - 1) {
    throw new Error("Race has not ended yet");
  }
};
