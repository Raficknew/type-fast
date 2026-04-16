"use client";

import type { User } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { getPlayerStats } from "@/features/player/actions/playerStats";
import { supabaseClient as supabase } from "@/lib/db";
import { getRaceScopedDisplayNames, getUserName } from "@/lib/pure";
import { UserNameEditDialog } from "../../users/components/UserNameEditDialog";

export function PlayerName({
  hasGameStarted,
  raceId,
  round,
}: {
  hasGameStarted?: boolean;
  raceId?: string;
  round?: number;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [raceScopedName, setRaceScopedName] = useState<string | null>(null);
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isDialogOpened, setIsDialogOpened] = useState(false);

  const fetchRaceScopedName = useCallback(async () => {
    if (!hasGameStarted || !raceId || round === undefined || !user) {
      setRaceScopedName(null);
      return;
    }

    try {
      const data = await getPlayerStats(raceId, round);
      const scopedNames = getRaceScopedDisplayNames(data);
      setRaceScopedName(scopedNames.get(user.id) ?? getUserName(user));
    } catch (error) {
      console.error(
        "Failed to load race-scoped player name",
        { raceId, round },
        error,
      );
    }
  }, [hasGameStarted, raceId, round, user]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchRaceScopedName();

    if (!hasGameStarted || !raceId || round === undefined) {
      return;
    }

    const scheduleFetch = () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      fetchTimeoutRef.current = setTimeout(() => {
        fetchTimeoutRef.current = null;
        fetchRaceScopedName();
      }, 200);
    };

    const channel = supabase
      .channel(`public:player_name:${raceId}:${round}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_stats",
          filter: `race_id=eq.${raceId}`,
        },
        (payload) => {
          const changedPlayer = (payload.new || payload.old) as {
            round?: number;
          };

          if (changedPlayer.round !== round) {
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
  }, [fetchRaceScopedName, hasGameStarted, raceId, round]);

  if (!user) {
    return <div>Loading Player...</div>;
  }

  const name = getUserName(user);
  const displayName = hasGameStarted ? (raceScopedName ?? name) : name;
  const isGenerated = displayName.startsWith("Player #");

  const handleNameUpdated = async (updatedName: string) => {
    setUser((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        user_metadata: {
          ...prev.user_metadata,
          name: updatedName,
        },
      };
    });

    if (hasGameStarted) {
      await fetchRaceScopedName();
    }
  };

  return (
    <div className="relative z-20 flex items-center gap-2">
      <p>
        Playing as{" "}
        <button
          type="button"
          data-testid="player-display-name"
          className="font-semibold text-sidebar-primary cursor-pointer"
          onClick={() => setIsDialogOpened(true)}
        >
          {displayName}
        </button>
      </p>
      <UserNameEditDialog
        name={isGenerated ? undefined : displayName}
        isOpened={isDialogOpened}
        setIsOpened={setIsDialogOpened}
        onNameUpdated={handleNameUpdated}
      />
    </div>
  );
}
