# RoveXP

RoveXP is a production-minded Turborepo monorepo for a mobile-first city exploration game with:

- `apps/mobile`: Expo + React Native app for iPhone and Android
- `apps/admin`: private Next.js admin dashboard for internal operations
- `packages/types`: shared entities, enums, Zod schemas, and mock-safe models
- `packages/config`: shared TypeScript config
- `supabase`: SQL migrations, RLS policies, storage rules, and seed data

Phase 2 builds on the original vertical slice with:

- real Supabase auth in mobile and admin
- persistent profiles and settings
- server-backed quest check-in and completion validation
- a live map experience with quest markers
- real leaderboard queries
- review photo upload + moderation foundations
- stronger quest filtering and preference persistence
- public vs friend profile identity separation
- friend codes, invite sharing, and sponsored quest hiding
- admin-controlled nearby-place import, nearby bulk candidate generation, and quest candidate generation

## Workspace

```text
/
  apps/
    admin/
    mobile/
  packages/
    config/
    types/
  supabase/
    migrations/
    seed.sql
  docs/
    architecture.md
```

## Stack

- Monorepo: Turborepo + pnpm workspaces
- Mobile: Expo, Expo Router, TypeScript, Zustand, TanStack Query, Expo Location, Expo Camera, Expo Image Picker, React Native Maps, Reanimated
- Admin: Next.js App Router, TypeScript, Tailwind CSS v4, shadcn/ui, Supabase SSR
- Backend: Supabase Auth, Postgres, RPC/SQL functions, RLS, Storage

## Quick Start

1. Install dependencies:

```bash
corepack enable
corepack pnpm install
```

2. Copy env examples:

```bash
cp apps/mobile/.env.example apps/mobile/.env
cp apps/admin/.env.example apps/admin/.env.local
```

3. Fill in the Supabase values:

- mobile uses `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- mobile can optionally use `EXPO_PUBLIC_OAUTH_GOOGLE_ENABLED`, `EXPO_PUBLIC_OAUTH_FACEBOOK_ENABLED`, and `EXPO_PUBLIC_OAUTH_APPLE_ENABLED`
- mobile also uses `EXPO_PUBLIC_DEFAULT_AREA_LABEL`, `EXPO_PUBLIC_DEFAULT_LATITUDE`, `EXPO_PUBLIC_DEFAULT_LONGITUDE`, and `EXPO_PUBLIC_DEFAULT_STATE_CODE`
- admin uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

`apps/mobile/.env` is intentionally local-only; the checked-in template lives at `apps/mobile/.env.example`.

4. Start the apps in separate terminals:

```bash
corepack pnpm dev:mobile
corepack pnpm dev:admin
```

5. If you want local Supabase:

```bash
supabase start
supabase db reset
```

## Common Commands

```bash
corepack pnpm dev
corepack pnpm dev:mobile
corepack pnpm dev:mobile:android
corepack pnpm dev:mobile:ios
corepack pnpm dev:admin
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm --filter @rovexp/admin build
```

## Environment Variables

Mobile app:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_OAUTH_GOOGLE_ENABLED`
- `EXPO_PUBLIC_OAUTH_FACEBOOK_ENABLED`
- `EXPO_PUBLIC_OAUTH_APPLE_ENABLED`
- `EXPO_PUBLIC_DEFAULT_AREA_LABEL`
- `EXPO_PUBLIC_DEFAULT_LATITUDE`
- `EXPO_PUBLIC_DEFAULT_LONGITUDE`
- `EXPO_PUBLIC_DEFAULT_STATE_CODE`

Admin app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy fallback only)

Keep secret/service-role keys out of the mobile and admin app code. The repository only uses public/publishable keys in client-facing environments.

Mobile OAuth redirect URL: `rovexp://auth/callback`
Supported mobile auth providers: email/password, Google, Facebook, and Apple on supported platforms.

Mobile keeps a mock-safe fallback when Supabase env values are blank. If Supabase is configured but a live request fails, the app shows an explicit runtime warning instead of pretending the backend is healthy. The admin dashboard now requires real Supabase env values and a user promoted in `public.admin_users`.

## Supabase

The schema and seed data live in [`supabase/`](./supabase):

- `supabase/migrations/20260418131500_phase1_init.sql`
- `supabase/migrations/20260419103000_phase2_progression_and_auth.sql`
- `supabase/migrations/20260420124000_phase3_social_graph.sql`
- `supabase/migrations/20260425152000_phase4_identity_privacy.sql`
- `supabase/migrations/20260426110000_phase5_places_candidates.sql`
- `supabase/seed.sql`

Phase 2 adds:

- stronger profile/settings support
- server-backed check-in and completion RPCs
- discovery type and featured quest metadata
- leaderboard RPCs for state, friends, and weekly views
- review moderation and storage access tightening

See [`supabase/README.md`](./supabase/README.md) for the local workflow.

## Docs

- architecture: [`docs/architecture.md`](./docs/architecture.md)
- showcase / deployment: [`docs/showcase-deployment.md`](./docs/showcase-deployment.md)
- mobile setup: [`apps/mobile/README.md`](./apps/mobile/README.md)
- admin setup: [`apps/admin/README.md`](./apps/admin/README.md)
- Supabase workflow: [`supabase/README.md`](./supabase/README.md)

## Showcase Readiness

RoveXP is intended to be easy to hand to judges, testers, and collaborators:

- the mobile app supports a clear demo mode when login is skipped
- the admin dashboard is meant for private deployment on Vercel
- mobile showcase builds are expected to ship through Expo / EAS
- live mode uses Supabase, while demo mode keeps the app usable without trapping the user

## Current Status

Implemented:

- real auth + session restoration on mobile
- real auth + admin role enforcement in admin
- profile/settings persistence
- server-backed quest validation
- map, leaderboard, and moderation foundations
- shared Phase 2 types and schema extensions

Intentional Phase 2 shortcuts:

- mobile still supports a clean fallback mode when Supabase envs are absent
- leaderboard queries are real, but category-specific boards and snapshot jobs are future work
- review moderation is intentionally simple and internal-only
- quest image and avatar uploads are path-ready, with richer media tooling left for later
