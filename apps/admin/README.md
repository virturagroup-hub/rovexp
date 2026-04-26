# RoveXP Admin

Private internal dashboard for operating quests, sponsors, rewards, titles, badges, reviews, and explorer visibility.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- Supabase SSR

## Routes

- `/login`
- `/dashboard`
- `/showcase`
- `/dashboard/sponsors`
- `/dashboard/places`
- `/dashboard/places/nearby`
- `/dashboard/candidates`
- `/dashboard/quests`
- `/dashboard/rewards`
- `/dashboard/titles`
- `/dashboard/badges`
- `/dashboard/reviews`
- `/dashboard/users`

## Setup

1. Install dependencies from the repo root:

```bash
corepack pnpm install
```

2. Copy envs:

```bash
cp apps/admin/.env.example apps/admin/.env.local
```

3. Fill in `apps/admin/.env.local` with the real Supabase project URL and publishable key.

4. Start the app:

```bash
corepack pnpm --filter @rovexp/admin dev
```

5. Open `http://localhost:3000`.

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy fallback only)
- `ADMIN_DEMO_ENABLED` (showcase/demo walkthrough toggle)

## Auth

The admin dashboard now requires real Supabase auth:

- users sign in with email/password through Supabase
- dashboard access is restricted to users present in `public.admin_users`
- authenticated non-admin users are redirected out of the dashboard

Promote admins after creating the auth user:

```sql
insert into public.admin_users (user_id, role)
values ('replace-with-auth-user-uuid', 'owner')
on conflict (user_id) do update set role = excluded.role;
```

## Demo Walkthrough Mode

If `ADMIN_DEMO_ENABLED=true`, the `/login` page shows a clearly labeled demo walkthrough entry path.
That path uses the seeded mock admin store and is meant for showcase exploration only.
The dashboard also exposes a persistent `/showcase` route that opens the same guided demo
inside the admin deployment after sign-in.

- live auth still works normally
- demo mode is only entered when the user explicitly chooses it
- demo mode can be disabled in production by leaving `ADMIN_DEMO_ENABLED` unset or `false`

The demo walkthrough highlights the major admin surfaces:

- Dashboard
- Showcase Demo
- Sponsors
- Places
- Candidates
- Reviews
- Users

## Vercel Deployment

This app is intended for a private/internal deployment on Vercel.

Recommended setup:

1. Create a Vercel project pointing at `apps/admin`.
2. Set the root directory to `apps/admin` if you are linking from the monorepo root.
3. Add the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` environment variables.
4. Pull the envs locally with `vercel env pull .env.local --yes` if you want a matching local `.env.local`.
5. Restrict access at the org/app level as needed because this dashboard is private/internal only.
6. Promote the allowed admin accounts in `public.admin_users`.

The admin dashboard is safe to deploy on a custom domain or the standard Vercel URL as long as only approved `admin_users` rows exist in Supabase.

## Content Pipeline

The internal control room now supports a place-to-quest workflow:

1. create or import `places`
2. open `/dashboard/places/nearby` to bulk-generate `quest_candidates` from stored nearby places
3. review and edit the candidate
4. publish the approved candidate into a live quest

That keeps humans in control while still giving the team a repeatable way to seed nearby content.
Duplicate places, inactive rows, private venues, and already-published sources are skipped automatically during the nearby bulk generator.
Nearby matching uses the stored place coordinates plus the admin-entered radius and filters; it is intentionally simple and easy to upgrade later if the place corpus grows.
Generated candidates now carry structured generation notes so reviewers can see the source place, vibe, title/description pattern, rarity rationale, and XP logic without digging through raw JSON.

## Showcase Demo Access

The intended showcase path is:

1. open `/login`
2. if `ADMIN_DEMO_ENABLED=true`, click `Open demo walkthrough`
3. or sign in with a promoted Supabase admin account and open `/showcase`

This demo mode uses the seeded mock admin store and is intentionally non-destructive. It is the safest way to present the admin experience during a deadline run.

For a concise handoff, see [`docs/showcase-demo.md`](../../docs/showcase-demo.md).
