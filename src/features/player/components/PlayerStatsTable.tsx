"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getPlayerStats } from "@/features/player/actions/playerStats";
import { supabaseClient as supabase } from "@/lib/db";
import type { PlayerStat } from "@/types/types";

export function PlayerStatsTable({
  raceId,
  round,
  wpm,
  accuracy,
  live_progress,
  userId,
}: {
  raceId: string;
  round: number;
  wpm?: number;
  accuracy?: number;
  live_progress?: string;
  userId?: string;
}) {
  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPlayers = useCallback(async () => {
    try {
      const data = await getPlayerStats(raceId, round);
      setPlayers(data.sort((a, b) => (b.wpm ?? 0) - (a.wpm ?? 0)));
    } catch (error) {
      console.error("Failed to load player stats", { raceId, round }, error);
    }
  }, [raceId, round]);

  const scheduleFetch = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      fetchTimeoutRef.current = null;
      void fetchPlayers();
    }, 200);
  }, [fetchPlayers]);

  useEffect(() => {
    void fetchPlayers();

    const channel = supabase
      .channel(`public:player_stats:${raceId}:${round}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_stats",
          filter: `race_id=eq.${raceId}`,
        },
        (payload) => {
          const player = (payload.new || payload.old) as {
            round?: number;
          };

          if (player.round !== round) {
            return;
          }

          scheduleFetch();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [raceId, round, fetchPlayers, scheduleFetch]);

  return (
    <table className="w-full text-left border-collapse text-sm">
      <thead>
        <tr className="border-b">
          <th className="py-2 pr-4">Live progress</th>
          <th className="py-2 pr-4">Player name</th>
          <th className="py-2 pr-4">Words per minute</th>
          <th className="py-2">Accuracy</th>
        </tr>
      </thead>
      <tbody>
        {players.map((player) => {
          const isCurrentUser = player.user_id === userId;
          return (
            <tr key={player.id} className="border-b last:border-0">
              <td className="py-2 pr-4">
                {isCurrentUser
                  ? (live_progress ?? "|")
                  : (player.live_progress ?? "-")}
              </td>
              <td className="py-2 pr-4">{player.name}</td>
              <td className="py-2 pr-4">
                {isCurrentUser
                  ? Number.isFinite(wpm)
                    ? wpm
                    : 0
                  : (player.wpm ?? 0)}
              </td>
              <td className="py-2">
                {isCurrentUser ? (accuracy ?? 0) : (player.accuracy ?? 0)}%
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
