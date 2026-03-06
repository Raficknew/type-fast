"use client";

import { deleteRace, restartRace } from "@/actions/race";
import { ensurePlayerRow, updatePlayerLiveStats } from "@/actions/playerStats";
import { MAX_ROUNDS, ROUND_TIME } from "@/gameSettings";
import { supabaseClient as supabase } from "@/lib/db";
import { calculateAccuracy, getTimeLeft } from "@/lib/pure";
import { PlayerStatsTable } from "@/components/PlayerStatsTable";
import type { User } from "@supabase/supabase-js";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function getDisplayName(user: User): string {
  return (
    user.user_metadata?.display_name ??
    `Player #${user.id.slice(0, 6).toUpperCase()}`
  );
}

type GameState = {
  sentence: string;
  round: number;
  id: string;
  currentText: string;
  currentWordIndex: number;
  correctWordsCount: number;
  counter: number;
  mistakes: number;
  hasRoundEnded: boolean;
  userHasFinished: boolean;
  wpm: number;
};

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
    currentText: "",
    currentWordIndex: 0,
    correctWordsCount: 0,
    counter: 0,
    mistakes: 0,
    hasRoundEnded: false,
    userHasFinished: false,
    wpm: 0,
  });
  const roundStartedAt = useRef<number>(0);
  const userRef = useRef<User | null>(null);
  const insertedRef = useRef(false);
  const gameRef = useRef(game);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const wordsInSentence = game.sentence.split(" ");
  const charCounter = game.sentence.length;
  const accuracy = calculateAccuracy({ charCounter, mistakes: game.mistakes });

  useEffect(() => {
    gameRef.current = game;
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, [game.round]);

  useEffect(() => {
    const initPlayer = async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) return;
      userRef.current = user;

      if (insertedRef.current) return;
      insertedRef.current = true; // claim the slot before any async work

      const existingWpm = await ensurePlayerRow(
        raceId,
        user.id,
        getDisplayName(user),
      ).catch(() => {
        insertedRef.current = false;
        return null;
      });

      if (existingWpm) {
        setGame((prev) => ({ ...prev, wpm: existingWpm }));
      }
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
  }, [raceId]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const interval = setInterval(async () => {
      const game = gameRef.current;
      if (game.userHasFinished || game.hasRoundEnded) return;

      const user = userRef.current;
      if (!user) return;

      const words = game.sentence.split(" ");
      const sentenceLength = game.sentence.length;
      const accuracy = calculateAccuracy({
        charCounter: sentenceLength,
        mistakes: game.mistakes,
      });

      await updatePlayerLiveStats(
        raceId,
        user.id,
        game.wpm,
        accuracy,
        words[game.currentWordIndex],
      );
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const elapsed = (ROUND_TIME - getTimeLeft(endTime)) * 1000;
    roundStartedAt.current = performance.now() - elapsed;
    setGame((prev) => ({ ...prev, counter: getTimeLeft(endTime) }));
  }, []);

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
            roundStartedAt.current = performance.now();
            setGame((prev) => ({
              ...prev,
              sentence: payload.new.sentence,
              round: payload.new.round,
              counter: ROUND_TIME,
              currentText: "",
              currentWordIndex: 0,
              correctWordsCount: 0,
              mistakes: 0,
              hasRoundEnded: false,
              userHasFinished: false,
              wpm: 0,
            }));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = (performance.now() - roundStartedAt.current) / 1000;
      const timeLeft = Math.round(ROUND_TIME - elapsed);
      if (timeLeft <= 0) {
        clearInterval(timer);
        setGame((prev) => ({ ...prev, counter: 0, hasRoundEnded: true }));
      } else {
        setGame((prev) => ({ ...prev, counter: timeLeft }));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [game.round]);

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
  }, [
    game.hasRoundEnded,
    game.userHasFinished,
    game.correctWordsCount,
    game.counter,
  ]);

  useEffect(() => {
    if (game.hasRoundEnded) {
      if (game.round + 1 >= MAX_ROUNDS) {
        deleteRace(raceId).catch(console.error);
      } else {
        restartRace(raceId, game.round).catch(() => {
          setGame((prev) => ({ ...prev, hasRoundEnded: false }));
        });
      }
    }
  }, [game.hasRoundEnded, game.round, raceId]);

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
      }));
      if (isLastWord && userRef.current) {
        updatePlayerLiveStats(
          raceId,
          userRef.current.id,
          game.wpm,
          accuracy,
          "FINISHED",
        ).catch(console.error);
      }
    } else {
      setGame((prev) => ({ ...prev, mistakes: prev.mistakes + 1 }));
    }
  };

  const handleInputChange = (text: string) => {
    const isDeleting = text.length < game.currentText.length;
    setGame((prev) => ({ ...prev, currentText: text }));

    if (text.endsWith(" ")) {
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

  return (
    <div className="flex flex-col gap-2 p-4 max-w-150">
      <div>Round: {game.round}</div>
      <div className="text-center text-2xl">Next Round in {game.counter}s</div>
      <div className="text-xl mb-4 bg-gray-100 p-2 rounded-sm select-none grow">
        {wordsInSentence.map((word, i) => (
          <span
            key={`${word}#${i}`}
            className={
              i < game.currentWordIndex
                ? "text-green-600"
                : i === game.currentWordIndex
                  ? "font-bold underline"
                  : "text-gray-500"
            }
          >
            {word}
            {i < wordsInSentence.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        className="border rounded-sm p-1 w-full"
        value={game.currentText}
        onChange={(e) => handleInputChange(e.target.value)}
        disabled={game.hasRoundEnded || game.userHasFinished}
      />
      <PlayerStatsTable
        name={userRef.current ? getDisplayName(userRef.current) : ""}
        wpm={game.wpm}
        accuracy={accuracy}
        live_progress={wordsInSentence[game.currentWordIndex] ?? "FINISHED"}
      />
    </div>
  );
}
