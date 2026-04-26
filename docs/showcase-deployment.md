# RoveXP Showcase Deployment

This guide is the practical handoff for a showcase build of RoveXP.

## What lives where

- `apps/mobile` is the Expo + React Native app for Android and iPhone.
- `apps/admin` is the private Next.js dashboard for content ops.
- `supabase` is the source of truth for auth, data, RLS, and storage.

## Repository hygiene for GitHub

The repo is ready to share as source control as long as you keep secrets out of tracked files.

- Track the `*.env.example` files.
- Keep `apps/mobile/.env` and `apps/admin/.env.local` local-only.
- Do not commit Supabase secret/service-role keys.
- Ignore generated app and deployment folders such as `.next`, `.expo`, `.vercel`, `.eas`, and `node_modules`.

The root README explains the expected local env files and which values go where.

## Local Development

```bash
corepack pnpm install
corepack pnpm dev:mobile
corepack pnpm dev:admin
```

If you want local Supabase while testing schema work:

```bash
supabase start
supabase db reset
```

## Admin on Vercel

The admin dashboard is designed to be deployed as a standalone private/internal Vercel app.
It includes a dedicated map explorer at `/dashboard/places/map` for place discovery and quest seeding
and a guided showcase route at `/showcase` for judges and testers.

Recommended setup:

1. Connect the GitHub repo to Vercel.
2. Set the root directory to `apps/admin`.
3. Add these environment variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `ADMIN_DEMO_ENABLED` if you want the explicit demo walkthrough button available during showcase runs
4. Use the default Next.js build command for the admin app.
5. Keep access limited to approved internal users.
6. Promote admin accounts in `public.admin_users` after creating their Supabase Auth users.
7. Share `/showcase` from the dashboard sidebar or use the `/showcase` route directly after sign-in.

Helpful commands:

```bash
cd apps/admin
vercel link --yes
vercel env pull .env.local --yes
vercel deploy --prod
```

## Mobile Distribution with Expo / EAS

The mobile app is ready for Expo/EAS build distribution.

Current bundle/package identifiers:

- iOS: `com.rovexp.mobile`
- Android: `com.rovexp.mobile`

Required mobile env variables:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_DEFAULT_AREA_LABEL`
- `EXPO_PUBLIC_DEFAULT_LATITUDE`
- `EXPO_PUBLIC_DEFAULT_LONGITUDE`
- `EXPO_PUBLIC_DEFAULT_STATE_CODE`

Optional provider toggles:

- `EXPO_PUBLIC_OAUTH_GOOGLE_ENABLED`
- `EXPO_PUBLIC_OAUTH_FACEBOOK_ENABLED`
- `EXPO_PUBLIC_OAUTH_APPLE_ENABLED`

Recommended flow:

```bash
cd apps/mobile
eas login
eas build:configure
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

For testers and judges:

- Android: use an internal distribution build or APK/AAB distribution path.
- iPhone: use TestFlight or an internal EAS iOS build flow.

## Demo vs Live Mode

- **Demo mode**: the user skips login and enters the walkthrough/local explorer path.
- **Live mode**: Supabase env values are present and the app restores a real session.

The app surfaces runtime status explicitly so testers can tell whether they are using live data, demo data, or a backend fallback.

The admin portal also supports an intentional demo walkthrough path when `ADMIN_DEMO_ENABLED=true`.
That path is useful for showcasing the dashboard, places, map explorer, candidates, and moderation tools without needing a privileged live account every time.

## Manual Steps Outside the Repo

These still need to happen in external dashboards or accounts:

1. Create or open the Supabase project.
2. Copy the project URL and public/publishable key into the env files.
3. Run the migration SQL files in order, then run `supabase/seed.sql`.
4. Create the first auth user and add that user to `public.admin_users`.
5. Enable any OAuth providers you actually want to use in the Supabase Auth dashboard.
6. Register the Apple bundle identifier and Android package in the Apple/Google developer consoles if you are shipping real builds.
7. Link the repo to Vercel and the Expo project to EAS before building.
8. Optionally set `ADMIN_DEMO_ENABLED=true` for showcase deployments that should expose the demo walkthrough button.

## Access Paths for a Showcase

Provide these to judges/testers:

- GitHub repository URL
- Admin Vercel URL
- Admin showcase route (`/showcase`)
- Android internal build link or APK/AAB path
- iOS TestFlight link
