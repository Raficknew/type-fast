"use client";

import { getRandomSentence } from "@/lib/pure";
import { useEffect, useRef, useState } from "react";

export function TypeTest({
  sentence,
  endGame,
}: {
  sentence: string;
  endGame: () => void;
}) {
  const [currentSentence, setCurrentSentence] = useState<string>(sentence);
  const roundTime = 10; // seconds
  const wordsInSentence = currentSentence.split(" ");
  const charCounter = currentSentence.length;

  const [currentText, setCurrentText] = useState<string>("");
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [correctWordsCount, setCorrectWordsCount] = useState<number>(0);
  const [counter, setCounter] = useState<number>(roundTime);
  const [mistakes, setMistakes] = useState<number>(0);

  const [hasRoundEnded, setHasRoundEnded] = useState<boolean>(false);
  const [roundKey, setRoundKey] = useState<number>(0);
  const WPM = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCounter((prevCounter) => {
        if (prevCounter <= 1) {
          clearInterval(timer);
          setHasRoundEnded(true);
          return 0;
        }
        return prevCounter - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [roundKey]);

  useEffect(() => {
    if (!hasRoundEnded && correctWordsCount > 0) {
      WPM.current = Math.round(
        (correctWordsCount / (roundTime - counter)) * 60,
      );
    }
  }, [hasRoundEnded, correctWordsCount, counter]);

  const restartGame = () => {
    setCurrentText("");
    setCurrentWordIndex(0);
    setCorrectWordsCount(0);
    setCounter(roundTime);
    setMistakes(0);
    setHasRoundEnded(false);
    WPM.current = 0;
    const newSentence = getRandomSentence();
    setCurrentSentence(newSentence);
    setRoundKey((prev) => prev + 1);
  };

  useEffect(() => {
    if (hasRoundEnded) {
      if (roundKey === 3) {
        endGame();
      } else {
        restartGame();
      }
    }
  }, [hasRoundEnded]);

  const handleWordCheck = (text: string) => {
    const isCorrect = text.trim() === wordsInSentence[currentWordIndex];
    const isLastWord = currentWordIndex === wordsInSentence.length - 1;

    if (isCorrect) {
      setCorrectWordsCount((prev) => prev + 1);
      setCurrentWordIndex((prev) => prev + 1);
      setCurrentText("");
      if (isLastWord) {
        setHasRoundEnded(true);
      }
    } else {
      setMistakes((prev) => prev + 1);
    }
  };

  const handleInputChange = (text: string) => {
    const isDeleting = text.length < currentText.length;
    setCurrentText(text);

    if (text.endsWith(" ")) {
      handleWordCheck(text);
    } else if (!isDeleting) {
      for (let i = 0; i < text.length; i++) {
        if (text[i] !== wordsInSentence[currentWordIndex][i]) {
          setMistakes((prev) => prev + 1);
          break;
        }
      }
    }
  };

  const calculateAccuracy = () => {
    if (charCounter === 0) return 100;
    return Math.round(((charCounter - mistakes) / charCounter) * 100);
  };

  return (
    <div className="flex flex-col gap-2 p-4 max-w-125">
      <div className="text-center text-2xl">Next Round in: {counter}</div>
      <div className="text-xl mb-4 bg-gray-100 p-2 rounded-sm">
        {currentSentence}
      </div>
      <input
        type="text"
        className="border rounded-sm p-1 w-full"
        value={currentText}
        onChange={(e) => handleInputChange(e.target.value)}
        disabled={hasRoundEnded}
      />
      <div>
        <h3>WPM: {WPM.current}</h3>
        <h3>Accuracy: {calculateAccuracy()}%</h3>
      </div>
    </div>
  );
}
