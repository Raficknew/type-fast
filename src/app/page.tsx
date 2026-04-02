import { redirect } from "next/navigation";
import { StartGameButton } from "@/components/StartGameButton";
import { PlayerName } from "@/features/player/components/PlayerName";
import { createRace, getRace } from "@/features/race/actions/race";
import { TypeTest } from "@/features/race/components/TypeTest";
import { MAX_ROUNDS } from "@/gameSettings";

export default async function TypeFastGamePage() {
  const race = await getRace().catch(() => null);
  const serverNow = new Date().toISOString();

  if (!race) {
    return (
      <div className="flex flex-col items-center gap-4">
        <PlayerName />
        <StartGameButton createRace={createRace} />
      </div>
    );
  }

  if (race.round >= MAX_ROUNDS - 1) {
    redirect(`/results/${race.id}`);
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <PlayerName hasGameStarted={true} raceId={race.id} round={race.round} />
      <TypeTest
        sentence={race.sentence}
        round={race.round}
        raceId={race.id}
        endTime={race.end_time}
        serverNow={serverNow}
      />
    </div>
  );
}
