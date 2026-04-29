# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/store-readiness-hardening`
- **Goal:** Remove the false-green paths from the mobile store/public-launch readiness gate.

## Architectural Decisions

- Extend the existing audit instead of adding a second store gate.
- Check Expo-hosted env-name presence with `eas env:list`, but never print sensitive values.
- Keep the audit read-only: do not mutate EAS config during the check.
- Verify asset-file existence on disk in addition to config string anchors.
- Fix the docs wording directly where the contradictory bullets currently live.

## Alternatives Considered

- Leaving remote EAS envs as a manual checklist item:
  - rejected because the gate was already claiming broader launch readiness and should prove the hosted env-name surface
- Creating a separate EAS-only audit:
  - rejected because one gate is easier to understand and less likely to drift
- Checking sensitive env values directly:
  - rejected because env-name presence is enough for this gate and keeps secrets out of logs

## Edge Cases

- `eas env:list` can fail when Expo CLI auth is missing; the audit should fail clearly.
- Sensitive envs show masked values in CLI output; the parser must only require names.
- The iOS icon path is a directory asset set, not a `.png`, so file existence must support both files and directories.

## Validation Plan

- Update the working docs.
- Harden the store-release audit for remote EAS env names and asset existence.
- Run `npm --prefix apps/mobile run lint`.
- Run `npm --prefix apps/mobile run typecheck`.
- Run `npm --prefix apps/mobile run export:web`.
- Run the real `audit:store-release-readiness` and `qa:mobile-store-release-readiness`.
- Update docs and handoff notes with the stronger proof surface.
