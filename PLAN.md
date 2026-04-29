# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/store-release-readiness`
- **Goal:** Add a repo-owned readiness gate for Expo store/public-launch preparation without pretending to automate store-console work.

## Architectural Decisions

- Add one local audit under `apps/mobile/scripts` that checks repo-owned store prerequisites only.
- Keep the audit static and read-only: inspect `app.config.ts`, `eas.json`, and current package wiring instead of touching Expo or store consoles.
- Make EAS build environments explicit in `eas.json` so build intent is stable across development, preview, and production.
- Document owner-owned App Store Connect and Google Play tasks separately in launch docs.

## Alternatives Considered

- Trying to automate App Store Connect or Google Play setup from the repo:
  - rejected because those steps are owner/account specific and not safely reproducible from this workstation
- Leaving store readiness as a docs-only item:
  - rejected because the repo can still prove whether the Expo app config and EAS config are shaped correctly
- Hardcoding placeholder submit identifiers into `eas.json`:
  - rejected because false placeholders create confusion and are easy to forget later

## Edge Cases

- The mobile app may be launch-ready for a private pilot while still missing broader public-launch store inputs; the audit should say that clearly.
- Expo config may have the right features but still miss stable build environment mapping; the audit should catch that.
- App-store metadata items like screenshots, privacy URLs, and listing copy are intentionally not in repo and must remain explicit external tasks.

## Validation Plan

- Update the working docs.
- Add the store/public-launch readiness audit and root wrapper.
- Make `eas.json` build environments explicit if they are not already.
- Run `npm --prefix apps/mobile run lint`.
- Run `npm --prefix apps/mobile run typecheck`.
- Run the new audit and its root QA wrapper.
- Update launch docs and handoff notes with the new gate and owner checklist.
