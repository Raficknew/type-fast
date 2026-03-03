# Note

**Time spent: ~3 hours** (17:00 – 20:00)

Due to time constraints, per-player real-time state and the competitor table were not implemented. The architecture (Supabase Realtime + shared race row) is designed to support them as a next step.

---

# Why this or that?

1. **Supabase** - I chose Supabase because it integrates well with Next.js and is a good option for this type of web app — it is easily scalable, which in production would be a huge advantage. It was my first time working with it, so it was a little challenging.
2. **Auto-restart** - I decided to implement auto-restart logic because I thought it would fit well with the flow of the app.
3. **Core Game Logic** - I decided to take an approach similar to TypeRacer: treat every word separately and update accuracy and words per minute on each word submission.
4. **WPM** - Calculated based on the number of correctly typed words divided by time elapsed, multiplied by 60.
5. **Accuracy** - Calculated by counting a mistake each time the user types a wrong letter, then comparing total mistakes against the total character count.
6. **Real-time session updates** - Used Supabase Realtime (`postgres_changes`) to broadcast sentence updates to all connected clients without polling.

---

# How to develop locally

1. Install dependencies
```bash
pnpm install
```

2. Set environment variables
```bash
cp .env.example .env.local
```
Fill in the following values from your Supabase project:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

3. Create the `race` table in Supabase with columns: `id`, `sentence`, `status`, `created_at`. Insert one row, make sure Row Level Security grants the necessary access, and enable `supabase_realtime` for the `race` table — you can find it under **Database → Publications**.

4. Start the dev server
```bash
pnpm dev
```

---

# What I would do next

1. RLS is currently set to full public access to speed up development. In production, access should be restricted to authenticated users only.
2. Add a channel for users to join using Supabase anonymous sign-ins.
3. Add real-time per-player score updates, similar to how the `race` table is synced.
4. Adjust the counter logic to be based on the server-side round end time rather than a local interval, to prevent drift between clients.

---

# Where I used AI

I used AI to generate the sentence pool in `sentences.ts`. The core game logic, Supabase integration, real-time mechanics, and overall architecture were written by hand.