"use client";
import { useEffect, useState } from "react";

export function RaceTimer({
  endTime,
  action,
}: {
  endTime: string;
  action: () => void;
}) {
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const endTimeMs = new Date(endTime).getTime();

    const timer = setInterval(() => {
      const elapsed = (Date.now() - endTimeMs) / 1000;
      const timeLeft = Math.round(30 - elapsed);
      if (timeLeft <= 0) {
        clearInterval(timer);
        action();
      } else {
        setCounter(timeLeft);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime, action]);

  return <div>Timer: {counter}</div>;
}
