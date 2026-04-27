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
```

## Current scope

- Expo Router shell in `src/app`
- Supabase client bootstrap in `src/lib/supabase.ts`
- Auth session provider in `src/providers/session-provider.tsx`
- React Query provider in `src/providers/app-providers.tsx`
- Push permission and Expo token preparation helper in `src/lib/push.ts`

## Next planned slice

- Supabase Google sign-in
- Real event queries
- `register-device-token` integration after native push testing
