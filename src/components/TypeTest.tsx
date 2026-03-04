"use client";

import { deleteRace, restartRace } from "@/actions/actions";
import { MAX_ROUNDS, ROUND_TIME } from "@/gameSettings";
import { supabase } from "@/lib/db";
import { getTimeLeft } from "@/lib/pure";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

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
  });
  const roundStartedAt = useRef<number>(0);
  const router = useRouter();

  // biome-ignore lint/correctness/useExhaustiveDependencies: <we want this to run only once on mount>
  useEffect(() => {
    const elapsed = (ROUND_TIME - getTimeLeft(endTime)) * 1000;
    roundStartedAt.current = performance.now() - elapsed;
    setGame((prev) => ({ ...prev, counter: getTimeLeft(endTime) }));
  }, []);

  const wordsInSentence = game.sentence.split(" ");
  const charCounter = game.sentence.length;
  const WPM = useRef(0);

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
            router.push("/");
          }

          if (payload.eventType === "UPDATE") {
            roundStartedAt.current = performance.now();
            WPM.current = 0;
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
    if (game.round >= MAX_ROUNDS) {
      router.push("/");
      return;
    }

    const timer = setInterval(() => {
      setGame((prev) => {
        const elapsed = (performance.now() - roundStartedAt.current) / 1000;
        const timeLeft = Math.round(ROUND_TIME - elapsed);
        if (timeLeft <= 0) {
          clearInterval(timer);
          return { ...prev, counter: 0, hasRoundEnded: true };
        }
        return { ...prev, counter: timeLeft };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [game.round]);

  useEffect(() => {
    if (
      !game.hasRoundEnded &&
      !game.userHasFinished &&
      game.correctWordsCount > 0
    ) {
      WPM.current = Math.round(
        (game.correctWordsCount / (ROUND_TIME - game.counter)) * 60,
      );
    }
  }, [
    game.hasRoundEnded,
    game.userHasFinished,
    game.correctWordsCount,
    game.counter,
  ]);

  useEffect(() => {
    if (game.hasRoundEnded) {
      if (game.round >= MAX_ROUNDS) {
        deleteRace(raceId).catch(console.error);
      } else {
        restartRace(raceId, game.round).catch(() => {
          // If the server action fails, reset hasRoundEnded so the
          // effect can re-trigger on the next render cycle.
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

  const calculateAccuracy = () => {
    if (charCounter === 0) return 100;
    return Math.round(((charCounter - game.mistakes) / charCounter) * 100);
  };

  return (
    <div className="flex flex-col gap-2 p-4 max-w-125">
      <div>Round: {game.round}</div>
      <div className="text-center text-2xl">Next Round in: {game.counter}</div>
      <div className="text-xl mb-4 bg-gray-100 p-2 rounded-sm">
        {game.sentence}
      </div>
      <input
        type="text"
        className="border rounded-sm p-1 w-full"
        value={game.currentText}
        onChange={(e) => handleInputChange(e.target.value)}
        disabled={game.hasRoundEnded || game.userHasFinished}
      />
      <table className="text-center">
        <thead>
          <tr>
            <th>WPM</th>
            <th>Accuracy</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{WPM.current}</td>
            <td>{calculateAccuracy()}%</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
