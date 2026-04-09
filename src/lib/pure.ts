import type { User } from "@supabase/supabase-js";
import { ROUND_TIME } from "@/gameSettings";
import type { PlayerResult, PlayerStat } from "@/types/types";
import { sentences } from "./sentences";

export const getRoundEndTime = () => {
  return new Date(Date.now() + ROUND_TIME * 1000).toISOString();
};

export const getTimeLeft = (endTime: string, nowMs = Date.now()) => {
  return Math.floor((new Date(endTime).getTime() - nowMs) / 1000);
};

export const STALE_RACE_THRESHOLD_MS = 2 * 60 * 1000;

export const isStaleRace = (
  endTime: string,
  nowMs = Date.now(),
  thresholdMs = STALE_RACE_THRESHOLD_MS,
) => {
  const endTimeMs = new Date(endTime).getTime();

  if (Number.isNaN(endTimeMs)) {
    return false;
  }

  return nowMs - endTimeMs > thresholdMs;
};

export const getServerClockOffset = (
  serverNow: string,
  clientNowMs = Date.now(),
) => {
  return new Date(serverNow).getTime() - clientNowMs;
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
    user.user_metadata?.name ?? `Player #${user.id.slice(0, 6).toUpperCase()}`
  );
};

export const getRaceScopedDisplayNames = (
  players: Array<{ user_id: string; name: string }>,
) => {
  const firstNameByUserId = new Map<string, string>();
  for (const player of players) {
    if (!firstNameByUserId.has(player.user_id)) {
      firstNameByUserId.set(player.user_id, player.name);
    }
  }

  const userIdsByName = new Map<string, string[]>();
  for (const [userId, name] of firstNameByUserId.entries()) {
    const userIds = userIdsByName.get(name) ?? [];
    userIds.push(userId);
    userIdsByName.set(name, userIds);
  }

  const scopedNameByUserId = new Map<string, string>();

  for (const [name, userIds] of userIdsByName.entries()) {
    const sortedUserIds = [...userIds].sort((a, b) => a.localeCompare(b));

    sortedUserIds.forEach((userId, index) => {
      const scopedName = index === 0 ? name : `${name} #${index + 1}`;
      scopedNameByUserId.set(userId, scopedName);
    });
  }

  return scopedNameByUserId;
};

export const summarizeResultsForPlayers = (playerStats: PlayerStat[]) => {
  const playerMap = new Map<string, PlayerStat[]>();
  const summarizedResults: PlayerResult[] = [];
  const raceScopedNameByUserId = getRaceScopedDisplayNames(playerStats);

  for (const playerStat of playerStats) {
    const existingStats = playerMap.get(playerStat.user_id);

    if (existingStats) {
      existingStats.push(playerStat);
    } else {
      playerMap.set(playerStat.user_id, [playerStat]);
    }
  }

  for (const [userId, stats] of playerMap.entries()) {
    const name = raceScopedNameByUserId.get(userId) ?? stats[0].name;
    const averageAccuracy =
      stats.reduce((sum, stat) => sum + stat.accuracy, 0) / stats.length;
    const averageWpm =
      stats.reduce((sum, stat) => sum + stat.wpm, 0) / stats.length;

    summarizedResults.push({
      userId,
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
