import { redirect } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFinalPlayersStats } from "@/features/player/actions/playerStats";
import { deleteRace, getRace } from "@/features/race/actions/race";
import { RaceTimer } from "@/features/race/components/RaceTimer";
import { summarizeResultsForPlayers } from "@/lib/pure";
import { cn } from "@/lib/utils";
import type { PlayerResult } from "@/types/types";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ raceId: string }>;
}) {
  const { raceId } = await params;
  const serverNow = new Date().toISOString();
  const [playerStats, race] = await Promise.all([
    getFinalPlayersStats(raceId),
    getRace(raceId),
  ]);

  if (!playerStats || !race) {
    redirect("/");
  }

  const raceResults = summarizeResultsForPlayers(playerStats);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <h2 className="text-muted-foreground">Results for Race </h2>
        <h2 className="text-xl text-sidebar-foreground">
          #{raceId.slice(0, 7).toUpperCase()}
        </h2>
        <RaceTimer
          title="Ends in"
          endTime={race.end_time}
          serverNow={serverNow}
          action={deleteRace.bind(null, raceId)}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Position</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Average WPM</TableHead>
            <TableHead>Average Accuracy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {raceResults.map((result: PlayerResult, index) => {
            const isWinner = index === 0;
            const position = index + 1;
            return (
              <TableRow
                className={cn(isWinner && "text-chart-1 bg-t")}
                key={result.userId}
              >
                <TableCell>{position}</TableCell>
                <TableCell>{result.name}</TableCell>
                <TableCell>{result.averageWpm.toFixed(2)}</TableCell>
                <TableCell>{result.averageAccuracy.toFixed(2)}%</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
