# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-04-29
- **Branch:** `feature/full-ui-redesign-foundation`
- **Scope:** Bring real event imagery into the mobile redesign. Use downloaded nightlife / social cover photos inside student event cards and event detail hero surfaces, keep the black-lime-white STARK palette, and preserve the current business logic.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `docs/CANVA_ASSET_HANDOFF.md`
- `apps/mobile/src/features/events/types.ts`
- `apps/mobile/src/features/events/student-events.ts`
- `apps/mobile/src/features/events/event-visuals.ts`
- `apps/mobile/src/features/events/components/event-card.tsx`
- `apps/mobile/src/app/student/events/index.tsx`
- `apps/mobile/src/app/student/events/[eventId].tsx`

## Risks

- The downloaded cover assets are local JPG files, but the failed Canva exports were HTML payloads saved with `.jpg` suffixes. Those bad files must not stay in the app bundle.
- Event cards currently have no `coverImageUrl` in the summary query, so adding image presentation requires a small data-shape update.
- Remote `cover_image_url` may be null or broken, so event visuals need a deterministic local fallback.
- Image-backed hero sections can hurt text contrast if overlays are too weak, especially on web export.
- This pass touches signed-in event discovery surfaces, so static validation must run again.

## Dependencies

- Existing STARK redesign branch state in `feature/full-ui-redesign-foundation`
- Local event-cover assets downloaded into `apps/mobile/assets/event-covers/`
- Existing event detail query already exposes `cover_image_url`
- Canva poster drafts already generated and kept as external links for marketing / in-app copy surfaces

## Existing Logic Checked

- `StudentEventDetail` already includes `coverImageUrl`, but `StudentEventSummary` does not.
- `event-card.tsx` still uses a synthetic hero block (`heroBand`, `heroGlow`) instead of a real image cover.
- `student/events/[eventId].tsx` still uses a text-only hero with a decorative glow.
- The best low-risk change is to use local fallback covers plus the existing remote `cover_image_url` field when available.

## Review Outcome

Keep the STARK palette and typography, but shift event discovery onto real cover art:

- add `coverImageUrl` to summary data
- create one deterministic event-cover helper
- use remote cover URLs when present
- fall back to local nightlife / social imagery when remote covers are missing
- keep strong dark overlays so text stays readable
- record the Canva poster outputs separately instead of forcing broken exports into the app bundle
