"use client";

import { supabaseClient as supabase } from "@/lib/db";
import { useEffect, useState } from "react";

type PlayerStat = {
  id: number;
  name: string;
  wpm: number;
  accuracy: number;
  live_progress: string;
};

export function PlayerStatsTable({
  wpm,
  accuracy,
  live_progress,
  name,
}: {
  wpm?: number;
  accuracy?: number;
  live_progress?: string;
  name?: string;
}) {
  const [players, setPlayers] = useState<PlayerStat[]>([]);

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data } = await supabase
        .from("player_stats")
        .select("*")
        .order("name");
      if (data) setPlayers(data);
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
  }, []);

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
                {isCurrentUser ? (wpm ?? 0) : (player.wpm ?? 0)}
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
