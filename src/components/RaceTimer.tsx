"use client";
import { useEffect, useState } from "react";
import { getTimeLeft } from "@/lib/pure";

export function RaceTimer({
  title,
  endTime,
  action,
  onTick,
}: {
  title: string;
  endTime: string;
  action: () => void;
  onTick?: (timeLeft: number) => void;
}) {
  const [counter, setCounter] = useState(() => getTimeLeft(endTime));

  useEffect(() => {
    setCounter(getTimeLeft(endTime));

    const timer = setInterval(() => {
      const timeLeft = getTimeLeft(endTime);
      if (timeLeft <= 0) {
        clearInterval(timer);
        setCounter(0);
        onTick?.(0);
        setTimeout(() => action(), 500);
      } else {
        setCounter(timeLeft);
        onTick?.(timeLeft);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, action, onTick]);

  return (
    <div>
      {title}: {counter}
    </div>
  );
}
