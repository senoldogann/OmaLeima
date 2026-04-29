# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `bug/native-google-auth-redirect`
- **Goal:** Fix physical-device Google sign-in in the Expo development build by aligning native OAuth redirect generation with the app scheme instead of a localhost callback.

## Architectural Decisions

- Keep the fix inside `apps/mobile/src/lib/auth.ts` so the already-installed development build can retest Google login without another native rebuild.
- Use Expo AuthSession’s explicit native redirect option for iOS and Android native contexts while keeping the existing path-based redirect for web.
- Leave the callback exchange route unchanged; once Safari returns to `omaleima://auth/callback`, the existing Expo Router callback screen should keep working.
- Fold in the pending EAS `projectId` fallback and iOS non-exempt-encryption plist field so the next build attempt stays clean.

## Alternatives Considered

- Rebuilding the app immediately and hoping the current redirect changes itself:
  - rejected because the screenshot shows a logic bug in the generated redirect URL, not a missing native capability
- Moving the fix into a new native plugin or separate callback route:
  - rejected because the current scheme and callback screen are already enough if the redirect URI is correct
- Patching only docs:
  - rejected because the blocker is live on the user’s device right now

## Edge Cases

- Web login must continue to use a browser URL callback and not switch to the native scheme.
- Native redirect generation should remain stable in both development builds and future standalone builds.
- The login screen’s displayed redirect URI should visibly confirm the fix once Metro reloads the app.
- The app config changes should not force a new native build before the user can retest this particular login bug.

## Validation Plan

- Run `expo config --json` to verify both the EAS project id and `ITSAppUsesNonExemptEncryption` are present in the resolved config.
- Run mobile `typecheck` and the existing native push readiness audit.
- Ask the user to reload the dev client and confirm the login screen now shows `omaleima://auth/callback` instead of a localhost redirect.
