"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { PlayerStatsTable } from "@/components/PlayerStatsTable";
import {
  ensurePlayerRoundRow,
  updatePlayerLiveStats,
} from "@/features/player/actions/playerStats";
import { finalizeRace, restartRace } from "@/features/race/actions/race";
import { MAX_ROUNDS, ROUND_TIME } from "@/gameSettings";
import { supabaseClient as supabase } from "@/lib/db";
import { calculateAccuracy, getUserName } from "@/lib/pure";
import type { GameState } from "@/types/types";
import { GameSentence } from "./GameSentence";
import { RaceTimer } from "./RaceTimer";

export function TypeTest({
  sentence,
  round,
  raceId,
  endTime,
}: {
  sentence: string;
  round: number;
  raceId: string;
  endTime: string;
}) {
  const [game, setGame] = useState<GameState>({
    sentence,
    round,
    id: raceId,
    endTime,
    currentText: "",
    currentWordIndex: 0,
    correctWordsCount: 0,
    counter: 0,
    mistakes: 0,
    hasRoundEnded: false,
    userHasFinished: false,
    wpm: 0,
    isWordWrong: false,
  });
  const userRef = useRef<User | null>(null);
  const insertedRoundsRef = useRef<Set<number>>(new Set());
  const gameRef = useRef(game);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const wordsInSentence = game.sentence.split(" ");
  const charCounter = game.sentence.length;
  const accuracy = calculateAccuracy({ charCounter, mistakes: game.mistakes });

  const ensureRoundRow = useCallback(
    async (user: User, targetRound: number) => {
      if (insertedRoundsRef.current.has(targetRound)) return;
      insertedRoundsRef.current.add(targetRound);

      try {
        const existingStats = await ensurePlayerRoundRow(
          raceId,
          user.id,
          getUserName(user),
          targetRound,
        );

        if (existingStats !== null) {
          setGame((prev) => {
            if (
              prev.round !== targetRound ||
              prev.round !== existingStats.round
            )
              return prev;

            const words = prev.sentence.split(" ");
            const progressIndex =
              existingStats.live_progress === "FINISHED"
                ? words.length
                : words.indexOf(existingStats.live_progress);
            const currentWordIndex = progressIndex === -1 ? 0 : progressIndex;
            let mistakes = 0;
            if (existingStats.accuracy > 0) {
              mistakes = Math.round(
                charCounter * (1 - existingStats.accuracy / 100),
              );
            }

            return {
              ...prev,
              wpm: existingStats.wpm,
              accuracy: existingStats.accuracy,
              correctWordsCount: currentWordIndex,
              currentWordIndex,
              mistakes,
            };
          });
        }
      } catch (error) {
        insertedRoundsRef.current.delete(targetRound);
        console.error(
          "Failed to ensure player_stats row",
          {
            raceId,
            userId: user.id,
            round: targetRound,
          },
          error,
        );
      }
    },
    [raceId, charCounter],
  );

  useEffect(() => {
    gameRef.current = game;
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: game.round is used as a trigger to re-focus on each new round
  useEffect(() => {
    inputRef.current?.focus();
  }, [game.round]);

  useEffect(() => {
    const initPlayer = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return;
      userRef.current = user;

      await ensureRoundRow(user, gameRef.current.round);
    };

    initPlayer();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        initPlayer();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [ensureRoundRow]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const currentGame = gameRef.current;
      if (currentGame.userHasFinished || currentGame.hasRoundEnded) return;

      const user = userRef.current;
      if (!user) return;

      const words = currentGame.sentence.split(" ");
      const sentenceLength = currentGame.sentence.length;
      const wpm = Math.round(
        (currentGame.correctWordsCount / (ROUND_TIME - currentGame.counter)) *
          60,
      );
      const accuracy = calculateAccuracy({
        charCounter: sentenceLength,
        mistakes: currentGame.mistakes,
      });

      currentGame.wpm = wpm;

      await updatePlayerLiveStats(
        raceId,
        user.id,
        currentGame.round,
        currentGame.wpm,
        accuracy,
        words[currentGame.currentWordIndex],
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [raceId]);

  useEffect(() => {
    const channel = supabase
      .channel("public:race")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "race",
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            router.refresh();
          }

          if (payload.eventType === "UPDATE") {
            setGame((prev) => ({
              ...prev,
              sentence: payload.new.sentence,
              round: payload.new.round,
              endTime: payload.new.end_time,
              counter: ROUND_TIME,
              currentText: "",
              currentWordIndex: 0,
              correctWordsCount: 0,
              mistakes: 0,
              hasRoundEnded: false,
              userHasFinished: false,
              wpm: 0,
              isWordWrong: false,
            }));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router.refresh]);

  useEffect(() => {
    if (
      !game.hasRoundEnded &&
      !game.userHasFinished &&
      game.correctWordsCount > 0
    ) {
      setGame((prev) => ({
        ...prev,
        wpm: Math.round(
          (prev.correctWordsCount / (ROUND_TIME - prev.counter)) * 60,
        ),
      }));
    }
  }, [game.hasRoundEnded, game.userHasFinished, game.correctWordsCount]);

  useEffect(() => {
    if (!game.hasRoundEnded) return;

    let isCancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;

    const tryAdvanceRound = async () => {
      if (isCancelled) return;

      if (game.round + 1 >= MAX_ROUNDS) {
        await finalizeRace(raceId);
        router.push(`/results/${raceId}`);
        return;
      }

      try {
        await restartRace(raceId, game.round);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Unknown error";

        if (message.includes("Restart conditions not met") && !isCancelled) {
          retryTimeout = setTimeout(() => {
            tryAdvanceRound();
          }, 500);
          return;
        }

        if (message.includes("Race state is out of date")) {
          return;
        }
        console.error(error);
      }
    };

    tryAdvanceRound();

    return () => {
      isCancelled = true;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [game.hasRoundEnded, game.round, raceId, router]);

  const handleWordCheck = (text: string) => {
    const isCorrect = text.trim() === wordsInSentence[game.currentWordIndex];
    const isLastWord = game.currentWordIndex === wordsInSentence.length - 1;

    if (isCorrect) {
      setGame((prev) => ({
        ...prev,
        correctWordsCount: prev.correctWordsCount + 1,
        currentWordIndex: prev.currentWordIndex + 1,
        currentText: "",
        userHasFinished: isLastWord ? true : prev.userHasFinished,
        hasRoundEnded: isLastWord ? true : prev.hasRoundEnded,
      }));
      if (isLastWord && userRef.current) {
        updatePlayerLiveStats(
          raceId,
          userRef.current.id,
          game.round,
          game.wpm,
          accuracy,
          "FINISHED",
        ).catch(console.error);
      }
    } else {
      setGame((prev) => ({
        ...prev,
        mistakes: prev.mistakes + 1,
        isWordWrong: true,
      }));
    }
  };

  const handleInputChange = (text: string) => {
    const isDeleting = text.length < game.currentText.length;

    if (game.isWordWrong && !isDeleting) return;

    if (isDeleting && game.isWordWrong) {
      setGame((prev) => ({ ...prev, currentText: text, isWordWrong: false }));
      return;
    }

    setGame((prev) => ({ ...prev, currentText: text }));

    const isLastWord = game.currentWordIndex === wordsInSentence.length - 1;

    if (text.endsWith(" ")) {
      handleWordCheck(text);
    } else if (isLastWord && text === wordsInSentence[game.currentWordIndex]) {
      handleWordCheck(text);
    } else if (!isDeleting) {
      for (let i = 0; i < text.length; i++) {
        if (text[i] !== wordsInSentence[game.currentWordIndex][i]) {
          setGame((prev) => ({ ...prev, mistakes: prev.mistakes + 1 }));
          break;
        }
      }
    }
  };

  const typedSoFar =
    game.currentWordIndex > 0
      ? wordsInSentence.slice(0, game.currentWordIndex).join(" ") +
        " " +
        game.currentText
      : game.currentText;

  const handleRoundEnd = useCallback(() => {
    setGame((prev) => ({ ...prev, counter: 0, hasRoundEnded: true }));
  }, []);

  const handleTimerTick = useCallback((timeLeft: number) => {
    setGame((prev) => ({ ...prev, counter: timeLeft }));
  }, []);

  return (
    <div className="flex flex-col gap-2 p-4 max-w-150">
      <div>Round: {game.round}</div>
      <RaceTimer
        title="Next Round in"
        endTime={game.endTime}
        action={handleRoundEnd}
        onTick={handleTimerTick}
      />
      <GameSentence game={game} typedSoFar={typedSoFar} />
      <input
        ref={inputRef}
        type="text"
        className="opacity-0 absolute left-0 top-0 w-full h-full"
        value={game.currentText}
        onChange={(e) => handleInputChange(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        disabled={game.hasRoundEnded || game.userHasFinished}
      />
      <PlayerStatsTable
        raceId={raceId}
        round={game.round}
        name={userRef.current ? getUserName(userRef.current) : ""}
        wpm={game.wpm}
        accuracy={accuracy}
        live_progress={wordsInSentence[game.currentWordIndex] ?? "FINISHED"}
      />
    </div>
  );
}
