# Supabase

This directory contains the RoveXP database foundation:

- SQL migrations for schema evolution
- row-level security policies
- storage bucket and storage policy setup
- seed data for local and development testing

Creating a Supabase project alone does **not** create the RoveXP tables or buckets. The migrations in this directory must be run before the app can use the live backend.

## Migration Order

Run the SQL files in this order:

1. [`migrations/20260418131500_phase1_init.sql`](./migrations/20260418131500_phase1_init.sql)
2. [`migrations/20260419103000_phase2_progression_and_auth.sql`](./migrations/20260419103000_phase2_progression_and_auth.sql)
3. [`migrations/20260420124000_phase3_social_graph.sql`](./migrations/20260420124000_phase3_social_graph.sql)
4. [`migrations/20260425152000_phase4_identity_privacy.sql`](./migrations/20260425152000_phase4_identity_privacy.sql)
5. [`migrations/20260426110000_phase5_places_candidates.sql`](./migrations/20260426110000_phase5_places_candidates.sql)
6. [`seed.sql`](./seed.sql)

That order matches the current repo history. Do not run the seed file before the migrations.

The seed now includes all 50 U.S. states so the mobile home-state picker can save against real `states.id` values, plus starter `places` and `quest_candidates` rows so the admin review pipeline is visible immediately.

## Fresh Project Checklist

1. Create a new Supabase project.
2. Copy the project URL and public/publishable key from the Supabase dashboard.
3. Put those values into:
   - `apps/mobile/.env`
   - `apps/admin/.env.local`
4. Enable the Supabase Auth providers you want to test:
   - email/password is required
   - Google, Facebook, and Apple are supported by the mobile UI
   - add `rovexp://auth/callback` as an allowed redirect URL
5. Run the migrations in the order above.
   - For local development, `supabase db reset` will apply the migrations and seed data together.
   - For a remote hosted project, paste the SQL files into the SQL Editor in order, or use your approved migration workflow.
6. Run `seed.sql` after the schema exists.
7. Create your first auth user through Supabase Auth.
8. Promote that user in `public.admin_users` so the admin dashboard allows access.
9. Restart Expo and Next.js so both apps pick up the new environment values.
10. Log in and verify:
    - mobile auth works
    - quests load from the live project
    - admin login reaches the dashboard
11. Open `/dashboard/places/nearby` in the admin app to preview a target area and bulk-generate draft quest candidates from stored places.

## Local Workflow

```bash
supabase start
supabase db reset
supabase status
```

`supabase db reset` is the easiest way to apply all local migrations and the seed file together.

## Included Migrations

- `20260418131500_phase1_init.sql`
- `20260419103000_phase2_progression_and_auth.sql`
- `20260420124000_phase3_social_graph.sql`
- `20260425152000_phase4_identity_privacy.sql`
- `20260426110000_phase5_places_candidates.sql`

## What the Schema Creates

- auth-driven `profiles` and `user_settings`
- quests, categories, acceptances, check-ins, completions, reviews, and review photos
- sponsor businesses, titles, badges, rewards, friendships, and state leaderboard aggregates
- friend codes, hidden sponsored quest preferences, and privacy-safe profile/leaderboard RPCs
- places and quest candidates for the admin-controlled nearby-place seeding pipeline
- the admin bulk nearby generator that previews stored places by state, radius, and filters before creating draft quest candidates
- storage buckets for `quest-images`, `sponsor-assets`, and `review-photos`
- RLS policies and server-side RPCs for quest verification, progress, social graph, and leaderboard reads
- nearby matching currently uses a first-pass haversine distance check in the admin app; PostGIS can replace it later if the place catalog grows substantially

## Important Notes

- Never put the `service_role` key or any secret Supabase key into mobile or public web code.
- Mobile uses `EXPO_PUBLIC_SUPABASE_URL` plus the public/publishable key in `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Admin uses `NEXT_PUBLIC_SUPABASE_URL` plus the public/publishable key in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Mobile OAuth redirects use `rovexp://auth/callback`.
- `profiles` and `user_settings` are auto-created when a new `auth.users` row is inserted.
- Quest progression safety is enforced in the database, not only in the client.
- Public clients can only read active quests, active sponsors, and visible reviews.
- Admin writes are gated through `admin_users` and `public.is_admin()`.
- `review-photos` is a private bucket; `quest-images` and `sponsor-assets` are public read buckets.
- Public leaderboard rows expose `username` handles; `display_name` stays friend/private-facing.

## Admin Bootstrap

Create a normal auth user first, then promote that user with the SQL snippet at the bottom of [`seed.sql`](./seed.sql).
