# RoveXP Architecture

## Goals

The repo is meant to stay small enough to move quickly while keeping the important edges production-minded:

- a native-feeling Expo app for Android and iPhone
- a private internal admin dashboard
- shared product language across frontend and backend
- Supabase as the system of record for auth, progression, and moderation

Phase 2 deepens the original vertical slice without rewriting the repo.

## Monorepo Boundaries

### `apps/mobile`

The mobile app owns the player-facing exploration experience:

- Expo Router for screen structure and navigation
- Zustand for persisted local app state
- TanStack Query for async server state
- a service layer that talks to Supabase by default and falls back to typed mock data only when envs are absent

Key slices:

- Supabase auth shell with persisted sessions
- permission flow for location and camera
- quest discovery feed and live filters
- map, leaderboard, and profile/settings surfaces
- quest progression and review submission

### `apps/admin`

The admin app owns internal content and moderation operations:

- Next.js App Router with server-rendered dashboard pages
- Supabase SSR for auth-aware server access
- server actions for mutations
- repository layer for data loading and writes

The admin surface is private only and now requires real Supabase auth plus `admin_users` membership.

### `packages/types`

This package keeps the shared product language in one place:

- enums and string unions
- core entities and view models
- Zod schemas for auth, content, profile, settings, and moderation forms
- mock-safe demo models for local development

### `packages/config`

Shared TypeScript config keeps workspace tsconfig files small and consistent.

### `supabase`

Supabase owns:

- auth-linked profile bootstrap
- quest progression tables and RPCs
- leaderboard reads
- admin role membership
- storage buckets and policies
- RLS and seed data

## Data Flow

### Mobile auth and profile

1. The app restores the Supabase session from Expo secure storage on launch.
2. `AuthBootstrap` syncs auth state into the mobile store.
3. Profile and settings are loaded after auth and pushed into the persisted store.
4. Screens route based on auth plus permission-flow completion.

### Mobile quest feed and progression

1. The app resolves current location when permission is granted.
2. `services/quests.ts` calls Supabase RPCs for nearby quests and progress.
3. Accept writes the user acceptance.
4. Check-in submits the live coordinates to a server-backed RPC for radius validation.
5. Completion runs through a server-backed RPC so XP is not client-controlled.
6. Reviews can upload an optional photo to Supabase Storage after completion.

### Map and leaderboards

1. Home, Quests, and Map share the same filtered quest feed.
2. Map markers reflect sponsor status and user progress state.
3. Leaderboards read from backend aggregation RPCs for state, friends, and weekly views.

### Admin CRUD and moderation

1. Dashboard routes require an authenticated Supabase session.
2. The auth user must also exist in `public.admin_users`.
3. Forms submit through server actions.
4. Shared Zod schemas validate payloads.
5. Repository functions read/write Supabase and revalidate dashboard paths.

## Security Model

Supabase RLS is the first line of protection:

- public clients can only read active quests, active sponsors, and visible reviews
- users can only manage their own profile, settings, acceptances, reviews, and review photo uploads
- admin writes are restricted through `admin_users` and `public.is_admin()`

The admin dashboard adds app-layer protection:

- authenticated non-admin users are blocked from dashboard routes
- missing Supabase env values block the admin surface entirely

## Design Approach

### Mobile

The mobile UI leans into exploration and progression:

- layered gradients and elevated cards
- rarity and discovery-type styling
- sponsor content that feels disclosed but attractive
- a map and leaderboard treatment that still feels game-like

### Admin

The admin UI stays operational, but avoids plain CRUD styling:

- editorial hero surfaces
- strong card hierarchy
- compact moderation and catalog workflows

## Intentional Phase 2 Shortcuts

- Mobile keeps a mock-safe fallback mode for local UI work when Supabase envs are missing.
- Leaderboards are query-backed, but snapshot jobs and seasonal logic are future work.
- Review moderation is intentionally lightweight and internal-only.
- Avatar and quest image uploads are path-ready, with richer media tooling left for later phases.
