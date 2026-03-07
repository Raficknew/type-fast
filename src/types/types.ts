export type GameState = {
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
  isWordWrong: boolean;
};
