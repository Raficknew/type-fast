"use client";

import { useEffect, useState } from "react";
import { getPlayerStats } from "@/features/player/actions/playerStats";
import { supabaseClient as supabase } from "@/lib/db";
import type { PlayerStat } from "@/types/types";

export function PlayerStatsTable({
  raceId,
  round,
  wpm,
  accuracy,
  live_progress,
  name,
}: {
  raceId: string;
  round: number;
  wpm?: number;
  accuracy?: number;
  live_progress?: string;
  name?: string;
}) {
  const [players, setPlayers] = useState<PlayerStat[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const data = await getPlayerStats(raceId, round);
        setPlayers(data);
      } catch (error) {
        console.error("Failed to load player stats", { raceId, round }, error);
      }
    };

    fetchPlayers();

    const channel = supabase
      .channel("public:player_stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "player_stats" },
        () => fetchPlayers(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raceId, round]);

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
          const isCurrentUser = player.name === name;
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
