import { redirect } from "next/navigation";
import { RaceTimer } from "@/components/RaceTimer";
import { getFinalPlayersStats } from "@/features/player/actions/playerStats";
import { deleteRace, getRace } from "@/features/race/actions/race";
import { summarizeResultsForPlayers } from "@/lib/pure";
import type { PlayerResult } from "@/types/types";

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
    <div className="flex flex-col gap-5 items-center">
      <div>Results for Race #{raceId.slice(0, 7).toUpperCase()}</div>
      <RaceTimer
        title="Ends in"
        endTime={race.end_time}
        action={deleteRace.bind(null, raceId)}
      />
      {raceResults.map((player, index) => (
        <PlayerCard
          key={player.averageWpm}
          player={{ ...player, postion: index + 1 }}
        />
      ))}
    </div>
  );
}

function PlayerCard({ player }: { player: PlayerResult }) {
  return (
    <div className="flex gap-2">
      <div>{player.postion}.</div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{player.name}</h2>
        <p>Average WPM: {player.averageWpm}</p>
        <p>Average Accuracy: {player.averageAccuracy}%</p>
      </div>
    </div>
  );
}
