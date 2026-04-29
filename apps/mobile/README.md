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
npm run audit:hosted-business-scan-readiness
npm run audit:native-simulator-smoke
npm run audit:native-push-device-readiness
npm run audit:realtime-readiness
npm run audit:reward-notification-bridge
```

## Current scope

- Expo Router shell in `src/app`
- Codex run actions via `script/build_and_run.sh` and `.codex/environments/environment.toml`
- Supabase client bootstrap in `src/lib/supabase.ts`
- Auth session provider in `src/providers/session-provider.tsx`
- React Query provider in `src/providers/app-providers.tsx`
- Push permission and Expo token preparation helper in `src/lib/push.ts`
- `expo-dev-client` alignment for development-build based native device smoke
- Native push diagnostics provider in `src/features/push/native-push-diagnostics.tsx`
- Local foreground reward notifications in `src/features/notifications/student-reward-notifications.ts`
- Google OAuth flow in `src/lib/auth.ts` and `src/app/auth/callback.tsx`
- Native session persistence via `expo-secure-store`
- QR token rotation currently uses controlled polling
- Student leaderboard, current-student progress, and shared reward inventory now use Realtime-driven query invalidation

## Realtime note

The first dedicated mobile Realtime slice is now shipped:

- QR rotation already refreshes through polling in `src/features/qr/student-qr.ts`
- `src/features/realtime/student-realtime.ts` subscribes to `leaderboard_updates` for leaderboard freshness
- the same module also subscribes to `stamps` and the current student’s `reward_claims` for progress freshness
- the same module also watches `reward_tiers` so shared inventory and out-of-stock state stay fresh on rewards, active-event, and event-detail views
- leaderboard and rewards still keep their existing typed React Query fetchers; Realtime only invalidates the right keys
- local foreground reward notifications are driven by the existing reward overview plus Realtime invalidation; remote reward-unlocked push delivery now ships from the `scan-qr` backend while remote stock-change push is still deferred
- the profile route now exposes native push diagnostics for runtime mode, permission state, last received notification, and last notification response during physical-device smoke
- the same profile route now records the last manual diagnostics refresh timestamp so the refresh button has visible feedback even when permission state does not change
- local foreground notifications can still appear in that diagnostics surface, but only entries marked from a remote source prove APNs or FCM-backed delivery
- the active student event screen now exposes a development-only hosted scanner smoke token so one physical iPhone can still exercise the real hosted `scan-qr` path through the business manual fallback

Use this command to confirm that state before extending or widening the Realtime layer:

```bash
npm run audit:realtime-readiness
```

Use this command to confirm the current reward notification bridge state:

```bash
npm run audit:reward-notification-bridge
```

Use this command to confirm the current native push device-smoke readiness state:

```bash
npm run audit:native-push-device-readiness
```

Use this command to confirm the current simulator and emulator wiring state:

```bash
npm run audit:native-simulator-smoke
```

Use this command to confirm the hosted same-device scanner smoke wiring:

```bash
npm run audit:hosted-business-scan-readiness
```

## OAuth setup notes

- Enable Google as an Auth provider in Supabase.
- Add your mobile redirect URL and local web callback URL to Supabase redirect allow-lists.
- Keep the Expo scheme aligned with `app.config.ts`.
- Native development-build Google OAuth now expects `omaleima://auth/callback` explicitly; if the login card ever shows a localhost redirect again, the native redirect helper regressed.

## Native push smoke note

- Expo Go is still useful for routing and auth checks, but real remote push verification needs a development build on a physical device.
- The current profile route is the manual smoke surface for that step.
- Simulator or emulator smoke can still validate launch flow, login flow, route guards, and diagnostics wiring before the final physical-device pass.
- On Android specifically, the emulator is the current fallback when no phone is available: use it for auth, event, QR, and scanner-flow coverage, but do not count it as remote-push proof.
- The repository audit for simulator or emulator work is wiring-only; it does not claim that a real native launch or remote push already succeeded.
- The current iPhone development-build smoke has already passed login, hosted device registration, rotating QR, and remote push receipt plus notification-open response.
- The runtime label now classifies the current physical-device dev client as a development build instead of `bare`.

## Hosted same-device scanner smoke

- The hosted smoke fixture now depends on the current hosted scanner credential from the local operator file, plus an active event, a joined venue, and a student registration.
- In development builds only, the active student event screen exposes a `Hosted scanner smoke token` card while a live QR token exists.
- The intended one-phone flow is:
  1. sign in as the student and open `My QR`
  2. copy the development-only token from that card
  3. sign out and switch into the business scanner account
  4. open `Business > Scanner`
  5. paste the token into the manual fallback box
- This still calls the real hosted `scan-qr` backend and is the current fallback path for physical-device smoke when only one iPhone is available.

## Codex action note

- In the Codex app, `apps/mobile` now exposes `Run`, `Run iOS`, `Run Android`, `Run Dev Client`, `Run Web`, `Expo Doctor`, and `Export Web` actions.
- The same shell entrypoint is `./script/build_and_run.sh`.
