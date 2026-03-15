import { PlayerName } from "@/components/PlayerName";
import { StartGameButton } from "@/components/StartGameButton";
import { TypeTest } from "@/components/TypeTest";
import { createRace, getRace } from "@/features/race/actions/race";

export default async function TypeFastGamePage() {
  const race = await getRace().catch(() => null);

  if (!race) {
    return (
      <div className="flex flex-col items-center gap-4">
        <PlayerName />
        <StartGameButton createRace={createRace} />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <PlayerName />
      <TypeTest
        sentence={race.sentence}
        round={race.round}
        raceId={race.id}
        endTime={race.end_time}
      />
    </div>
  );
}
