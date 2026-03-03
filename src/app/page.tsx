"use client";
import { TypeTest } from "@/components/TypeTest";
import { getRandomSentence } from "@/lib/pure";
import { useState } from "react";

export default function TypeFastGamePage() {
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const [sentence, setSentence] = useState<string>("");

  const startGame = () => {
    setHasGameStarted(true);
    const randomSentence = getRandomSentence();
    setSentence(randomSentence);
  };

  const endGame = () => {
    setHasGameStarted(false);
    setSentence("");
  };

  if (!hasGameStarted && !sentence) {
    return (
      <button
        className="bg-blue-400 px-10 py-4 rounded-sm text-white text-2xl"
        type="button"
        onClick={startGame}
      >
        Start Game
      </button>
    );
  }

  return <TypeTest sentence={sentence} endGame={() => endGame()} />;
}
