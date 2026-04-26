# @rovexp/config

Shared configuration primitives for the RoveXP monorepo.

Phase 1 keeps this package intentionally small:

- shared TypeScript base config
- Next.js-specific TypeScript config
- Expo/React Native TypeScript config

The goal is to keep app packages aligned without forcing web-only or mobile-only configuration into the wrong runtime.
