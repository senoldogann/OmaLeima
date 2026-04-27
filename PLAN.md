# PLAN.md

Bu dosya her yeni feature branch'te koddan önce tasarımı netleştirmek için kullanılır.

## Current Plan

- **Date:** 2026-04-28
- **Branch:** `feature/mobile-student-rewards-progress`
- **Goal:** Add the first real student reward progress surface and reuse it on both the rewards tab and the active QR screen.

## Architectural Decisions

- Keep this slice read-only on mobile. Reward claim recording already belongs to the staff-confirmed backend path, so the student app will only explain progress, claimable tiers, claimed tiers, and stock state.
- Build one shared reward-progress data layer under `apps/mobile/src/features/rewards`:
  1. read the student's registered event ids
  2. load matching public event summaries in one query
  3. load active reward tiers for those events in one query
  4. load the student's own reward claims in one query
  5. load the student's valid stamps in one query and derive per-event counts on the client
- Derive tier state in pure functions so both `student/rewards` and `student/active-event` render the same source of truth:
  1. `CLAIMED`
  2. `CLAIMABLE`
  3. `MORE_NEEDED`
  4. `OUT_OF_STOCK`
- Keep the existing QR token flow unchanged. The QR screen will only swap its simple leima progress block for the new shared reward-progress component.
- Show claimability clearly, but do not expose a student self-claim button in this slice. The UI should direct the student toward venue or club handoff instead of pretending the claim is completed in-app.

## Alternatives Considered

- Reusing the event-detail reward tier list directly: rejected because it lacks stamp counts, claim rows, and event-level summary state, which would force duplicate derivation inside screens.
- Adding a new Supabase RPC just for reward progress reads: rejected for now because the current RLS model already allows the exact reads we need, and this slice should stay minimal.
- Adding a tappable mobile `claim-reward` action for students: rejected because the existing product flow expects physical staff confirmation before a reward is actually handed over.

## Edge Cases

- The student has registered events but no reward tiers on one of them.
- A tier is already claimed even though the student now has fewer visible stamps than expected after local fixture changes.
- A tier is eligible by stamps but inventory is depleted.
- The rewards tab has only one seeded tier by default, so local validation must add at least one more tier and one claimed row to verify all UI states.
- The active QR screen still needs to render cleanly when reward progress is loading or when the selected event has no active tiers.

## Validation Plan

- Reset local Supabase with the current migrations and seed data.
- Run `npm run lint` in `apps/mobile`.
- Run `npm run typecheck` in `apps/mobile`.
- Run `npm run export:web` in `apps/mobile`.
- Run local Supabase-authenticated smoke checks for:
  1. seeded registered student reward overview query
  2. fixture-driven multi-tier states: claimable, claimed, more-needed, out-of-stock
  3. active-event reward progress query on the selected event
- Start the local web preview and verify both `/student/rewards` and `/student/active-event` routes render with the shared reward surface.
