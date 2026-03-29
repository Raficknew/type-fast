import type { User } from "@supabase/supabase-js";
import { ROUND_TIME } from "@/gameSettings";
import type { PlayerResult, PlayerStat } from "@/types/types";
import { sentences } from "./sentences";

export const getRoundEndTime = () => {
  return new Date(Date.now() + ROUND_TIME * 1000).toISOString();
};

export const getTimeLeft = (endTime: string) => {
  return Math.floor((new Date(endTime).getTime() - Date.now()) / 1000);
};

export const getRandomSentence = () => {
  return sentences[Math.floor(Math.random() * sentences.length)];
};

export const calculateAccuracy = ({
  charCounter,
  mistakes,
}: {
  charCounter: number;
  mistakes: number;
}) => {
  if (charCounter === 0) return 100;
  return Math.max(
    0,
    Math.round(((charCounter - mistakes) / charCounter) * 100),
  );
};

export const getUserName = (user: User): string => {
  return (
    user.user_metadata?.display_name ??
    `Player #${user.id.slice(0, 6).toUpperCase()}`
  );
};

export const summarizeResultsForPlayers = (playerStats: PlayerStat[]) => {
  const playerMap = new Map<string, PlayerStat[]>();
  const summarizedResults: PlayerResult[] = [];

  for (const playerStat of playerStats) {
    const existingStats = playerMap.get(playerStat.name);

    if (existingStats) {
      existingStats.push(playerStat);
    } else {
      playerMap.set(playerStat.name, [playerStat]);
    }
  }

  for (const [name, stats] of playerMap.entries()) {
    const averageAccuracy =
      stats.reduce((sum, stat) => sum + stat.accuracy, 0) / stats.length;
    const averageWpm =
      stats.reduce((sum, stat) => sum + stat.wpm, 0) / stats.length;

    summarizedResults.push({
      name,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      averageWpm: Math.round(averageWpm * 100) / 100,
      roundsPlayed: stats.length,
    });
  }

  return summarizedResults.sort(
    (a, b) => b.roundsPlayed - a.roundsPlayed || b.averageWpm - a.averageWpm,
  );
};
