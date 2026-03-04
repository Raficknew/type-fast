import { ROUND_TIME } from "@/gameSettings";
import { sentences } from "./sentences";

export const getRoundEndTime = () => {
  const endTime = new Date(Date.now() + ROUND_TIME * 1000).toLocaleTimeString(
    "pl-PL",
  );

  return endTime;
};

export const getTimeLeft = (endTime: string) => {
  const currentTime = new Date().toLocaleTimeString("pl-PL");

  const toSeconds = (time: string) => {
    const [h, m, s] = time.split(":").map(Number);
    return h * 3600 + m * 60 + s;
  };

  return toSeconds(endTime) - toSeconds(currentTime);
};

export const getRandomSentence = () => {
  return sentences[Math.floor(Math.random() * sentences.length)];
};
