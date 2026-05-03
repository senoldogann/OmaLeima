# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-03
- **Branch:** `feature/business-manage-event-rail-preview`
- **Scope:** Make business manage events show all joinable public events and replace vertical lists with image rails plus event preview modal.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/business/events.tsx`
- `apps/mobile/src/features/business/business-home.ts`
- `apps/mobile/src/features/business/types.ts`

## Existing Logic Checked

- Hosted live data shows the two user-created events are `Students Ready Party` in Tampere and `Haalarimerkki Approv` in Oulu.
- The pilot business is in Helsinki, and the previous opportunity query filtered by business city; therefore those two public joinable events were hidden.
- `join_business_event_atomic` does not require same-city joining; it validates auth, active business/staff, public status, deadline, and start time.
- Business manage screen currently renders live/upcoming/joinable/past as vertical lists with little visual context.

## Risks

- Showing all public joinable events can include other cities; cards must display city clearly so staff chooses intentionally.
- Joined live/upcoming/past buckets should not duplicate joinable opportunities for already joined venues.
- Past event cards must remain read-only and not offer scanner actions.
- Modal previews must not navigate or mutate state unless the explicit join/leave/scan buttons are used.

## Review Outcome

Remove the city-only opportunity filter, include cover/description/status fields in the business event read model, render business manage sections as horizontal image rails, and add a full preview modal for joined and joinable events.
