"use client";

import { Reorder, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Table,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getPlayerStats } from "@/features/player/actions/playerStats";
import { supabaseClient as supabase } from "@/lib/db";
import { getRaceScopedDisplayNames } from "@/lib/pure";
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

  const sortedPlayerIds = useMemo(
    () => [...players].sort((a, b) => b.wpm - a.wpm).map((player) => player.id),
    [players],
  );
  const [orderedPlayerIds, setOrderedPlayerIds] =
    useState<string[]>(sortedPlayerIds);
  const shouldReduceMotion = useReducedMotion();
  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  );
  const raceScopedNameByUserId = useMemo(
    () => getRaceScopedDisplayNames(players),
    [players],
  );

  useEffect(() => {
    setOrderedPlayerIds(sortedPlayerIds);
  }, [sortedPlayerIds]);

  const fetchPlayers = useCallback(async () => {
    try {
      const data = await getPlayerStats(raceId, round);
      setPlayers(data);
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
      fetchPlayers();
    }, 200);
  }, [fetchPlayers]);

  useEffect(() => {
    fetchPlayers();

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
    <Table className="w-full text-left border-collapse text-sm">
      <TableHeader className="p-0">
        <TableRow>
          <TableHead>Live progress</TableHead>
          <TableHead>Player name</TableHead>
          <TableHead>Words per minute</TableHead>
          <TableHead>Accuracy</TableHead>
        </TableRow>
      </TableHeader>
      <Reorder.Group
        as="tbody"
        axis="y"
        values={orderedPlayerIds}
        onReorder={setOrderedPlayerIds}
        className="[&_tr:last-child]:border-0"
      >
        {orderedPlayerIds.map((playerId) => {
          const player = playerById.get(playerId);
          if (!player) {
            return null;
          }

          const isCurrentUser = player.user_id === userId;
          return (
            <Reorder.Item
              key={player.id}
              as="tr"
              value={player.id}
              dragListener={false}
              layout={shouldReduceMotion ? undefined : "position"}
              className="border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted"
              transition={
                shouldReduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 520, damping: 42 }
              }
            >
              <TableCell>
                {isCurrentUser
                  ? (live_progress ?? "|")
                  : (player.live_progress ?? "-")}
              </TableCell>
              <TableCell>
                {raceScopedNameByUserId.get(player.user_id) ?? player.name}
              </TableCell>
              <TableCell>
                {isCurrentUser
                  ? Number.isFinite(wpm)
                    ? wpm
                    : 0
                  : (player.wpm ?? 0)}
              </TableCell>
              <TableCell>
                {isCurrentUser ? (accuracy ?? 0) : (player.accuracy ?? 0)}%
              </TableCell>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>
    </Table>
  );
}
