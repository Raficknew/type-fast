import { createRace } from "@/actions/race";
import { PlayerName } from "@/components/PlayerName";
import { StartGameButton } from "@/components/StartGameButton";
import { TypeTest } from "@/components/TypeTest";
import { supabaseServer as supabase } from "@/lib/db";

export default async function TypeFastGamePage() {
  let hasGameStarted = false;
  const { data } = await supabase.from("race").select();

  if (data && data.length > 0) {
    hasGameStarted = true;
  }

  if (!hasGameStarted || !data || data.length === 0) {
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
        sentence={data[0].sentence}
        round={data[0].round}
        raceId={data[0].id}
        endTime={data[0].end_time}
      />
    </div>
  );
}
