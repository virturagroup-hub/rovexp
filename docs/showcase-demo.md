# RoveXP Showcase Demo

This is the short handoff for the deadline-friendly demo path.

## Mobile demo

- Open the mobile app.
- Skip login to enter demo mode.
- Demo mode uses the curated Chicago quest board so Home, Quests, Profile, and Leaderboards stay populated.
- Demo mode is intentionally non-destructive and does not require a live Supabase session.

## Admin demo

- Open the admin portal.
- The admin demo walkthrough is enabled by default unless `ADMIN_DEMO_ENABLED=false` is set.
- The login page shows `Open demo walkthrough`.
- You can also open `/demo` directly to skip login and enter the seeded demo session immediately.
- Those demo paths use the seeded mock admin store and keep live content untouched.
- If you want the real admin flow, sign in with a Supabase admin user and open `/showcase`.

## Seeded content

The seed data includes:

- all 50 U.S. states
- starter places in Chicago
- sponsored quests and featured quests
- quest candidates ready for review

The mobile demo board is aligned to downtown Chicago so the seeded quests appear without extra setup.

## What is intentionally out of scope for the showcase

- live Google Maps / Places integration inside the admin app
- a separate public marketing site
- advanced external places APIs

## Useful routes

- `/showcase` in the admin app
- `/dashboard/places`
- `/dashboard/places/nearby`
- `/dashboard/candidates`
