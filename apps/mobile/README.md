# RoveXP Mobile

Native mobile client for RoveXP, built with Expo, React Native, Expo Router, Zustand, and TanStack Query.

## Phase 2 Scope

- Supabase email/password sign up and sign in
- Google, Facebook, and Apple OAuth sign-in where the provider is enabled in Supabase
- persisted mobile sessions with secure storage
- onboarding + permission flow compatible with real auth
- home and quests feeds with saved filters
- server-backed accept -> check-in -> complete -> review flow
- live quest map with marker states
- leaderboard tabs powered by backend queries
- profile edit + settings persistence

## Setup

1. Install workspace dependencies from the repo root:

```bash
corepack pnpm install
```

2. Copy the env file:

```bash
cp .env.example .env
```

3. Fill in `apps/mobile/.env` with the real project values:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_OAUTH_GOOGLE_ENABLED`
- `EXPO_PUBLIC_OAUTH_FACEBOOK_ENABLED`
- `EXPO_PUBLIC_OAUTH_APPLE_ENABLED`
- `EXPO_PUBLIC_DEFAULT_AREA_LABEL`
- `EXPO_PUBLIC_DEFAULT_LATITUDE`
- `EXPO_PUBLIC_DEFAULT_LONGITUDE`
- `EXPO_PUBLIC_DEFAULT_STATE_CODE`

`apps/mobile/.env` is a local-only file and is ignored by git; keep the values on your machine or in your build environment.

Expo reads `EXPO_PUBLIC_*` values directly in app code. If the Supabase values are blank, the mobile app uses typed mock fallback data so you can still test the UI locally. If Supabase is configured but a request fails, the Home tab shows an explicit runtime warning instead of pretending the live backend is healthy.

OAuth provider setup:

- enable Google, Facebook, and/or Apple in the Supabase Auth dashboard
- add `rovexp://auth/callback` as an allowed redirect URL
- Apple Sign-In is only shown on supported platforms in the app UI, but the provider still needs to be enabled in Supabase
- if a provider is not configured in Supabase, hide or disable that button during testing

4. Start Expo:

```bash
corepack pnpm --filter @rovexp/mobile start
```

Native shortcuts:

```bash
corepack pnpm --filter @rovexp/mobile android
corepack pnpm --filter @rovexp/mobile ios
```

## Environment Variables

- `EXPO_PUBLIC_SUPABASE_URL` - your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - the public key used by Expo/mobile clients
- `EXPO_PUBLIC_OAUTH_GOOGLE_ENABLED` - set to `true` only when Google auth is configured for the build
- `EXPO_PUBLIC_OAUTH_FACEBOOK_ENABLED` - set to `true` only when Facebook auth is configured for the build
- `EXPO_PUBLIC_OAUTH_APPLE_ENABLED` - set to `true` only when Apple auth is configured for the build
- `EXPO_PUBLIC_DEFAULT_AREA_LABEL` - fallback area label shown before live location is available
- `EXPO_PUBLIC_DEFAULT_LATITUDE` - fallback latitude for the seeded exploration district
- `EXPO_PUBLIC_DEFAULT_LONGITUDE` - fallback longitude for the seeded exploration district
- `EXPO_PUBLIC_DEFAULT_STATE_CODE` - fallback state code for the seeded quest area
- `rovexp://auth/callback` - Expo deep-link redirect used by Supabase OAuth sessions

When the Supabase values are blank, the app falls back to typed mock data for local UI development. When Supabase is configured but the backend is missing schema, buckets, or policies, the app keeps running with fallback data but exposes that state clearly in the UI and developer console.

## Notes

- This app is native-first for Android and iPhone. Web export is not the target experience.
- Location permission improves nearby quest relevance, map centering, and secure check-in validation.
- Review photo upload is optional. The review can still save if the comment/rating succeeds but storage upload fails.
- `react-native-maps` is included for the Phase 2 quest map experience.
- Public leaderboard/profile surfaces use `username` handles, while `display_name` stays friend-visible.
- The Friends screen includes copy/share friend codes and add-by-code invites backed by Supabase.

## Showcase Builds

The mobile app is ready for Expo / EAS distribution through [`eas.json`](./eas.json).

Current app identifiers:

- iOS bundle identifier: `com.rovexp.mobile`
- Android package: `com.rovexp.mobile`

Recommended commands:

```bash
cd apps/mobile
eas login
eas build:configure
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

The skip-login path still enters demo mode, which is the intended showcase fallback when a tester does not sign in.

Manual steps outside the repo:

- create or link the Expo project before running the first build
- register the iOS bundle identifier in the Apple Developer account
- register the Android package name in Google Play Console if you plan to ship beyond internal distribution
- enable any OAuth providers you actually want to use in Supabase Auth
- keep `apps/mobile/.env` local-only and populate it with the public Supabase values
