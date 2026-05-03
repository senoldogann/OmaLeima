# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/business-scanner-role-policy-review`
- **Scope:** Clarify scanner-role profile permissions, audit relevant business/club policies, and improve student visibility into joined venues and collected leimat.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/business/profile.tsx`
- `apps/mobile/src/app/student/events/[eventId].tsx`
- `apps/mobile/src/features/events/student-event-detail.ts`
- `apps/mobile/src/features/events/types.ts`

## Existing Logic Checked

- Business profile editing is intentionally limited to `OWNER` and `MANAGER` via `canManageBusinessProfile` and `public.is_business_manager_for`.
- `SCANNER` staff can read profile context and scan joined events, but should not update business identity or media.
- Business event joining/leaving is available through `/business/events`; scanner/home surfaces active joined events.
- Student event detail already lists joined venues, but lacks business logos/covers and per-venue stamp status.
- Club event/profile policies are owner/organizer/admin scoped after the previous migration; scanner business policies remain manager scoped.

## Risks

- Do not open profile writes to `SCANNER`; it would let counter staff change official business identity.
- Student venue status must only use the signed-in student's own stamp rows.
- Public business/event venue reads should not expose private business-only fields beyond already public profile basics.
- Avoid N+1 queries for venue stamp state.

## Review Outcome

Keep the RLS model role-based, make scanner read-only behavior explicit in UI, add an event-management shortcut from business profile, and enrich student venue rows with logo/cover plus collected/pending leima status.
