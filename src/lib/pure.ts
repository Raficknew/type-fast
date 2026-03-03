import { sentences } from "./sentences";

export const getRandomSentence = () => {
  return sentences[Math.floor(Math.random() * sentences.length)];
};
