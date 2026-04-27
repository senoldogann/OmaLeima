# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-expo-foundation`
- **Goal:** Start Phase 3 with a real Expo app foundation that future student flows can build on safely.

## Architectural Decisions

- Keep the Expo app inside `apps/mobile`, matching the master plan and leaving room for a future `apps/admin` sibling.
- Stay close to the current Expo SDK 55 default template: keep `src/app` routing, typed routes, and root config in the app root.
- Convert the app config to `app.config.ts` so public Supabase keys and future EAS project IDs can be injected from env cleanly.
- Add only the mobile libraries that are immediately needed for this slice:
  1. `@supabase/supabase-js`
  2. `react-native-url-polyfill`
  3. `expo-sqlite`
  4. `expo-notifications`
  5. `@tanstack/react-query`
  6. `zod`
- Replace the Expo demo screens with a clean route shell:
  1. root redirect
  2. `auth/login`
  3. student tab layout
  4. placeholder student screens that reflect the planned information architecture
- Create shared mobile infrastructure modules before any feature logic:
  1. public env parsing
  2. Supabase client
  3. auth session provider
  4. React Query provider
  5. push permission and Expo token helper
- Keep Google auth, live event queries, device token registration, and QR generation out of this branch; this is foundation only.

## Alternatives Considered

- Creating the mobile app at the repo root: rejected because the master plan already reserves `apps/mobile` and the repo will later need an admin app sibling.
- Keeping the generated Expo demo UI and layering project code around it: rejected because it would leave too much unrelated template surface for later agents.
- Starting Google auth in the same branch: rejected because it would mix infrastructure with a second risky slice that needs separate validation and likely real OAuth configuration.

## Edge Cases

- Public Supabase env vars are missing.
- Expo push permission is requested on web or simulator.
- EAS project ID is not configured yet.
- Session bootstrap is still loading during the first route resolution.
- The app needs a previewable shell even before Google auth is implemented.

## Validation Plan

- Install the Expo dependencies in `apps/mobile`.
- Run `npm run lint` in `apps/mobile`.
- Run `npx tsc --noEmit` in `apps/mobile`.
- Export the app for web with `npx expo export --platform web` to catch route and config issues.
- Confirm the generated route tree and config files match the intended student shell structure.
