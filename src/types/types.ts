export type GameState = {
  sentence: string;
  round: number;
  id: string;
  endTime: string;
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

export type PlayerStat = {
  id: string;
  user_id: string;
  name: string;
  round: number;
  wpm: number;
  accuracy: number;
  live_progress: string;
};

export type PlayerResult = {
  userId: string;
  name: string;
  averageWpm: number;
  averageAccuracy: number;
  roundsPlayed: number;
  position?: number;
};
