import type { User } from "@supabase/supabase-js";
import { ROUND_TIME } from "@/gameSettings";
import { sentences } from "./sentences";

export const getRoundEndTime = () => {
  return new Date(Date.now() + ROUND_TIME * 1000).toISOString();
};

export const getTimeLeft = (endTime: string) => {
  return Math.floor((new Date(endTime).getTime() - Date.now()) / 1000);
};

export const getRandomSentence = () => {
  return sentences[Math.floor(Math.random() * sentences.length)];
};

export const calculateAccuracy = ({
  charCounter,
  mistakes,
}: {
  charCounter: number;
  mistakes: number;
}) => {
  if (charCounter === 0) return 100;
  return Math.round(((charCounter - mistakes) / charCounter) * 100);
};

export const getUserName = (user: User): string => {
  return (
    user.user_metadata?.display_name ??
    `Player #${user.id.slice(0, 6).toUpperCase()}`
  );
};
