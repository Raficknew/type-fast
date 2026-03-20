import { redirect } from "next/navigation";
import { RaceTimer } from "@/components/RaceTimer";
import { getFinalPlayersStats } from "@/features/player/actions/playerStats";
import { deleteRace, getRace } from "@/features/race/actions/race";
import { summarizeResultsForPlayers } from "@/lib/pure";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;
  const [playerStats, race] = await Promise.all([
    getFinalPlayersStats(raceId),
    getRace(raceId),
  ]);

  if (!playerStats || !race) {
    redirect("/");
  }

  const raceResults = summarizeResultsForPlayers(playerStats);

  return (
    <div>
      <div>Results for Race #{raceId.slice(0, 7).toUpperCase()}</div>
      <RaceTimer
        endTime={race.end_time}
        action={deleteRace.bind(null, raceId)}
      />
      {raceResults.map((player) => (
        <div key={player.name} className="mb-4">
          <h2 className="text-lg font-semibold">{player.name}</h2>
          <p>Average WPM: {player.averageWpm}</p>
          <p>Average Accuracy: {player.averageAccuracy}%</p>
        </div>
      ))}
    </div>
  );
}
