"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { getServerClockOffset, getTimeLeft } from "@/lib/pure";

export function RaceTimer({
  title,
  endTime,
  serverNow,
  action,
  onTick,
}: {
  title: string;
  endTime: string;
  serverNow: string;
  action: () => void;
  onTick?: (timeLeft: number) => void;
}) {
  const [counter, setCounter] = useState(0);
  const startedAtRef = useRef<number>(0);
  const initialTimeLeftRef = useRef<number>(0);
  const serverOffsetMs = useMemo(
    () => getServerClockOffset(serverNow),
    [serverNow],
  );

  useEffect(() => {
    const nowOnServerClock = Date.now() + serverOffsetMs;
    const initialTimeLeft = getTimeLeft(endTime, nowOnServerClock);
    initialTimeLeftRef.current = initialTimeLeft;
    startedAtRef.current = performance.now();

    setCounter(initialTimeLeft);
    onTick?.(initialTimeLeft);

    let actionTimeout: ReturnType<typeof setTimeout> | null = null;

    const timer = setInterval(() => {
      const elapsed = (performance.now() - startedAtRef.current) / 1000;
      const timeLeft = Math.round(initialTimeLeftRef.current - elapsed);

      if (timeLeft <= 0) {
        clearInterval(timer);
        setCounter(0);
        onTick?.(0);
        actionTimeout = setTimeout(() => action(), 500);
      } else {
        setCounter(timeLeft);
        onTick?.(timeLeft);
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      if (actionTimeout) clearTimeout(actionTimeout);
    };
  }, [endTime, serverOffsetMs, action, onTick]);

  return (
    <div>
      {title}: {counter}
    </div>
  );
}
