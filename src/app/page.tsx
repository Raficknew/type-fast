import { TypeTest } from "@/components/TypeTest";
import { supabase } from "@/lib/db";

export default async function TypeFastGamePage() {
  let hasGameStarted = false;
  const { data } = await supabase.from("race").select();

  if (data && data.length > 0) {
    hasGameStarted = true;
  }

  if (!hasGameStarted || !data || data.length === 0) {
    return <div>You have to manually insert the race to the database</div>;
  }

  return (
    <TypeTest
      sentence={data[0]?.sentence || ""}
      round={0}
      raceId={data[0]?.id}
    />
  );
}
