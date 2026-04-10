import { cn } from "@/lib/utils";
import type { GameState } from "@/types/types";

export function GameSentence({
  game,
  typedSoFar,
}: {
  game: GameState;
  typedSoFar: string;
}) {
  const cursorPos = typedSoFar.length;
  const chars = game.sentence.split("");

  const tokens: { chars: string[]; startIndex: number }[] = [];
  let i = 0;
  while (i < chars.length) {
    if (chars[i] === " ") {
      tokens.push({ chars: [" "], startIndex: i });
      i++;
    } else {
      const start = i;
      const wordChars: string[] = [];
      while (i < chars.length && chars[i] !== " ") {
        wordChars.push(chars[i]);
        i++;
      }
      tokens.push({ chars: wordChars, startIndex: start });
    }
  }

  return (
    <div
      data-testid="game-sentence"
      className="w-full text-xl text-pretty rounded select-none leading-relaxed tracking-wide cursor-text grow"
    >
      {tokens.map((token) => (
        <span
          key={token.startIndex}
          className={
            token.chars[0] === " " ? "inline" : "inline-block whitespace-nowrap"
          }
        >
          {token.chars.map((char, j) => {
            const idx = token.startIndex + j;
            const isTyped = idx < cursorPos;
            const isCursor = idx === cursorPos;
            const isCorrect = isTyped && typedSoFar[idx] === char;
            const isWrongSpace = isTyped && !isCorrect && char === " ";

            return (
              <span
                key={idx}
                className={cn(
                  "relative inline",
                  isTyped
                    ? isCorrect
                      ? "text-chart-1"
                      : "text-destructive"
                    : "text-muted-foreground",
                  isWrongSpace ? "bg-destructive rounded-sm" : "",
                )}
              >
                {isCursor && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-0 top-[0.05em] h-[1.2em] w-0.5 rounded bg-primary"
                  />
                )}
                {isTyped && !isCorrect ? typedSoFar[idx] : char}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
}
