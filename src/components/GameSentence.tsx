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
    <div className="w-full text-xl rounded select-none leading-relaxed tracking-wide cursor-text grow">
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
                className={[
                  "relative inline",
                  isTyped
                    ? isCorrect
                      ? "text-green-400"
                      : "text-red-400"
                    : "text-gray-500",
                  isWrongSpace ? "bg-red-400/50 rounded-sm" : "",
                  isCursor ? "border-l-2" : "",
                ]
                  .join(" ")
                  .trim()}
              >
                {char}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
}
