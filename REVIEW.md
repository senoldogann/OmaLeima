# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/business-active-event-membership-fix`
- **Scope:** Fix business event visibility confusion by exposing past joined events and seeding a current hosted scanner smoke event.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/business/events.tsx`
- `apps/mobile/src/app/business/home.tsx`
- `apps/mobile/src/features/business/business-home.ts`
- `apps/mobile/src/features/business/types.ts`

## Existing Logic Checked

- Live scanner visibility is intentionally based on joined event venues and current `start_at`/`end_at` time windows.
- Hosted pilot business is `OmaLeima Test Bar` in Helsinki and is attached to `pilot-scanner@example.com` and `pilot-business-manager@example.com`.
- Hosted `ACTIVE` showcase events for that business are already past relative to 2026-05-03, so scanner correctly reports no live event.
- Joined past events were dropped from business overview, which made staff think active/published events were missing instead of ended.
- Future public events currently visible in hosted data are in Tampere/Oulu, so a Helsinki business does not see them as city opportunities.

## Risks

- Do not scan ended events. Scanner must stay limited to currently live joined venues.
- Do not make non-Helsinki opportunities appear for the Helsinki pilot business.
- Past joined events should be informational only; no scan action should be offered.
- Hosted smoke event creation must be explicit test data with a clear name and current time window.

## Review Outcome

Add a visible completed joined-events bucket to business home/events so past joined events do not silently disappear, and create a current joined Helsinki smoke event for the pilot business to verify scanner live behavior.
