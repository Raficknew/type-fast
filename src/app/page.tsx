import { createRace } from "@/actions/actions";
import { StartGameButton } from "@/components/StartGameButton";
import { TypeTest } from "@/components/TypeTest";
import { supabase } from "@/lib/db";

export default async function TypeFastGamePage() {
  let hasGameStarted = false;
  const { data } = await supabase.from("race").select();

  if (data && data.length > 0) {
    hasGameStarted = true;
  }

  if (!hasGameStarted || !data || data.length === 0) {
    return <StartGameButton createRace={createRace} />;
  }

  return (
    <TypeTest
      sentence={data[0].sentence}
      round={data[0].round}
      raceId={data[0].id}
      endTime={data[0].end_time}
    />
  );
}
