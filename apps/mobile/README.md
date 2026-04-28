# OmaLeima Mobile

Phase 3 Expo foundation for the student mobile app.

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Fill in `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. Start the app:

```bash
npm install
npx expo start
```

## Useful commands

```bash
npm run lint
npm run typecheck
npm run export:web
npm run audit:realtime-readiness
```

## Current scope

- Expo Router shell in `src/app`
- Supabase client bootstrap in `src/lib/supabase.ts`
- Auth session provider in `src/providers/session-provider.tsx`
- React Query provider in `src/providers/app-providers.tsx`
- Push permission and Expo token preparation helper in `src/lib/push.ts`
- Google OAuth flow in `src/lib/auth.ts` and `src/app/auth/callback.tsx`
- Native session persistence via `expo-secure-store`
- QR token rotation currently uses controlled polling
- Student leaderboard and the current student’s stamp/claim progress now use Realtime-driven query invalidation

## Realtime note

The first dedicated mobile Realtime slice is now shipped:

- QR rotation already refreshes through polling in `src/features/qr/student-qr.ts`
- `src/features/realtime/student-realtime.ts` subscribes to `leaderboard_updates` for leaderboard freshness
- the same module also subscribes to `stamps` and the current student’s `reward_claims` for progress freshness
- leaderboard and rewards still keep their existing typed React Query fetchers; Realtime only invalidates the right keys
- shared reward inventory and out-of-stock transitions still rely on the next query fetch, not a broad event-level inventory subscription yet

Use this command to confirm that state before extending or widening the Realtime layer:

```bash
npm run audit:realtime-readiness
```

## OAuth setup notes

- Enable Google as an Auth provider in Supabase.
- Add your mobile redirect URL and local web callback URL to Supabase redirect allow-lists.
- Keep the Expo scheme aligned with `app.config.ts`.
