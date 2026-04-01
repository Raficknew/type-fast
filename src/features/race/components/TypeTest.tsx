"use client";

import type { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensurePlayerRoundRow,
  updatePlayerLiveStats,
} from "@/features/player/actions/playerStats";
import { PlayerStatsTable } from "@/features/player/components/PlayerStatsTable";
import { finalizeRace, restartRace } from "@/features/race/actions/race";
import { MAX_ROUNDS, ROUND_TIME } from "@/gameSettings";
import { supabaseClient as supabase } from "@/lib/db";
import { calculateAccuracy, getUserName } from "@/lib/pure";
import type { GameState } from "@/types/types";
import { GameSentence } from "../../../components/GameSentence";
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
  const roundsAdvancingRef = useRef<Set<number>>(new Set());
  const lastLiveUpdateRef = useRef<{
    round: number;
    wpm: number;
    accuracy: number;
    liveProgress: string;
  } | null>(null);
  const gameRef = useRef(game);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const wordsInSentence = game.sentence.split(" ");
  const charCounter = game.sentence.length;
  const accuracy = calculateAccuracy({ charCounter, mistakes: game.mistakes });
  const calculateLiveWpm = useCallback(
    (correctWordsCount: number, counter: number) => {
      const clampedCounter = Math.min(ROUND_TIME, Math.max(0, counter));
      const elapsedSeconds = Math.max(1, ROUND_TIME - clampedCounter);

      return Math.round((correctWordsCount / elapsedSeconds) * 60);
    },
    [],
  );

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
              wpm: existingStats.wpm ?? 0,
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

  const tryAdvanceRound = useCallback(
    async (roundToAdvance: number) => {
      if (roundsAdvancingRef.current.has(roundToAdvance)) {
        return;
      }

      roundsAdvancingRef.current.add(roundToAdvance);

      try {
        if (roundToAdvance + 1 >= MAX_ROUNDS) {
          await finalizeRace(raceId);
          return;
        }
        for (let attempt = 0; attempt < 8; attempt++) {
          const result = await restartRace(raceId, roundToAdvance);

          if (
            result.status === "advanced" ||
            result.status === "out_of_date" ||
            result.status === "race_ended"
          ) {
            return;
          }

          if (result.status !== "not_ready") {
            return;
          }

          if (gameRef.current.round !== roundToAdvance) {
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 400));
        }

        await restartRace(raceId, roundToAdvance);
      } catch (error) {
        console.error(error);
      } finally {
        roundsAdvancingRef.current.delete(roundToAdvance);
      }
    },
    [raceId],
  );

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
      const wpm = calculateLiveWpm(
        currentGame.correctWordsCount,
        currentGame.counter,
      );
      const accuracy = calculateAccuracy({
        charCounter: sentenceLength,
        mistakes: currentGame.mistakes,
      });

      const liveProgress =
        words[currentGame.currentWordIndex] === undefined
          ? "FINISHED"
          : words[currentGame.currentWordIndex];

      const nextPayload = {
        round: currentGame.round,
        wpm,
        accuracy,
        liveProgress,
      };

      const lastPayload = lastLiveUpdateRef.current;
      if (
        lastPayload &&
        lastPayload.round === nextPayload.round &&
        lastPayload.wpm === nextPayload.wpm &&
        lastPayload.accuracy === nextPayload.accuracy &&
        lastPayload.liveProgress === nextPayload.liveProgress
      ) {
        return;
      }

      currentGame.wpm = wpm;
      lastLiveUpdateRef.current = nextPayload;

      await updatePlayerLiveStats(
        raceId,
        user.id,
        nextPayload.round,
        nextPayload.wpm,
        nextPayload.accuracy,
        nextPayload.liveProgress,
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [raceId, calculateLiveWpm]);

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
            if (payload.new.round >= MAX_ROUNDS) {
              router.push(`/results/${raceId}`);
              return;
            }
            const newRound = payload.new.round;
            setGame((prev) => {
              if (prev.round === newRound) {
                return prev;
              }
              return {
                ...prev,
                sentence: payload.new.sentence,
                round: newRound,
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
              };
            });

            if (userRef.current) {
              ensureRoundRow(userRef.current, newRound);
            }

            lastLiveUpdateRef.current = null;
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raceId, router, ensureRoundRow]);

  useEffect(() => {
    const channel = supabase
      .channel(`public:player_stats:${raceId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "player_stats",
          filter: `race_id=eq.${raceId}`,
        },
        (payload) => {
          const updatedPlayer = payload.new as {
            round?: number;
            live_progress?: string;
          };

          if (
            updatedPlayer.round !== gameRef.current.round ||
            updatedPlayer.live_progress !== "FINISHED"
          ) {
            return;
          }

          tryAdvanceRound(gameRef.current.round);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raceId, tryAdvanceRound]);

  useEffect(() => {
    if (
      !game.hasRoundEnded &&
      !game.userHasFinished &&
      game.correctWordsCount > 0
    ) {
      setGame((prev) => ({
        ...prev,
        wpm: calculateLiveWpm(prev.correctWordsCount, prev.counter),
      }));
    }
  }, [
    game.hasRoundEnded,
    game.userHasFinished,
    game.correctWordsCount,
    calculateLiveWpm,
  ]);

  const handleWordCheck = (text: string) => {
    const isCorrect = text.trim() === wordsInSentence[game.currentWordIndex];
    const isLastWord = game.currentWordIndex === wordsInSentence.length - 1;

    if (isCorrect) {
      const nextCorrectWordsCount = game.correctWordsCount + 1;
      const nextWpm = calculateLiveWpm(nextCorrectWordsCount, game.counter);

      setGame((prev) => ({
        ...prev,
        correctWordsCount: nextCorrectWordsCount,
        currentWordIndex: prev.currentWordIndex + 1,
        currentText: "",
        wpm: nextWpm,
        userHasFinished: isLastWord ? true : prev.userHasFinished,
        hasRoundEnded: isLastWord ? true : prev.hasRoundEnded,
      }));
      if (isLastWord && userRef.current) {
        const finishedPayload = {
          round: game.round,
          wpm: nextWpm,
          accuracy,
          liveProgress: "FINISHED",
        };
        lastLiveUpdateRef.current = finishedPayload;

        updatePlayerLiveStats(
          raceId,
          userRef.current.id,
          finishedPayload.round,
          finishedPayload.wpm,
          finishedPayload.accuracy,
          finishedPayload.liveProgress,
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
    const roundToAdvance = gameRef.current.round;
    setGame((prev) => ({ ...prev, counter: 0, hasRoundEnded: true }));
    tryAdvanceRound(roundToAdvance);
  }, [tryAdvanceRound]);

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
        userId={userRef.current?.id}
        wpm={game.wpm}
        accuracy={accuracy}
        live_progress={wordsInSentence[game.currentWordIndex] ?? "FINISHED"}
      />
    </div>
  );
}
