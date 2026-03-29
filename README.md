# TypeFast

A real-time multiplayer typing speed game. Compete with others across 6 rounds, track live WPM and accuracy, and see the final leaderboard when the race ends.

## Tech Stack

- **Next.js 16** — App Router, Server Actions, server/client component separation
- **Supabase** — Postgres database, anonymous auth, and Realtime for live updates
- **TypeScript** — strict mode throughout
- **Tailwind CSS** — utility-first styling
- **Vitest** — unit tests for pure game logic
- **Biome** — linting and formatting

## Features

- Anonymous authentication — no sign-up required, just pick a name and play
- Word-by-word typing validation with live WPM and accuracy tracking
- Real-time competitor table powered by Supabase `postgres_changes`
- 6-round tournament structure with auto-advance when all players finish or time expires
- Results page with average WPM and accuracy per player across all rounds

## How it works

**WPM** — correct words typed divided by elapsed time, multiplied by 60.

**Accuracy** — a mistake is counted each time the user types a wrong character. Final accuracy is `(total chars - mistakes) / total chars * 100`.

**Round progression** — the server advances the round when either the timer expires or all connected players have finished. A new sentence is picked randomly and the end time is reset.

**Real-time sync** — race state is broadcast to all clients via Supabase Realtime (`postgres_changes`) on the `race` and `player_stats` tables, no polling.

## Local setup

1. Install dependencies

```bash
pnpm install
```

2. Copy the env template and fill in your Supabase project values

```bash
cp .env.template .env
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase project → Settings → API |

3. Set up the database

Create two tables in Supabase:

**`race`** — `id` (uuid, PK), `sentence` (text), `round` (int, default 0), `end_time` (timestamptz), `created_at` (timestamptz)

**`player_stats`** — `id` (bigint, PK), `race_id` (uuid, FK → race.id), `user_id` (uuid), `name` (text), `round` (int), `wpm` (float), `accuracy` (float), `live_progress` (text)

Add a unique constraint on `player_stats(race_id, user_id, round)` and enable Realtime for both tables under **Database → Publications**.

4. Start the dev server

```bash
pnpm dev
```

## Running tests

```bash
pnpm test --run
```
