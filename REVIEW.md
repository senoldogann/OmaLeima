# REVIEW.md

Bu dosya her yeni feature branch'te kod yazmadan once sistem analizini kaydetmek icin kullanilir.

## Current Review

- **Date:** 2026-05-04
- **Branch:** `feature/business-event-slider-popup-polish`
- **Scope:** Make the business scanner route more event-day/kiosk friendly after the duplicate scan and media recovery fixes.

## Affected Files

- `REVIEW.md`
- `PLAN.md`
- `TODOS.md`
- `PROGRESS.md`
- `apps/mobile/src/app/business/scanner.tsx`

## Existing Logic Checked

- Business home already redirects scanner-only staff with an active joined event to `/business/scanner`.
- Business event membership restrictions are already backend-backed: scanner staff cannot join or leave events.
- Business home and business events already use horizontal event rails and preview modal behavior.
- Scanner route still showed checkpoint/device panels before the camera, which made event-day scanning feel like a management screen.

## Risks

- The scanner still needs enough context for staff to confirm the selected venue and device state.
- PIN-required scanner devices must keep a visible PIN input before scanning.
- Device registration failures must stay actionable without pushing the camera below unnecessary content.

## Review Outcome

Keep the existing scan transport and backend checks intact, but move the camera to the primary scanner surface. Collapse selected event and device state into a compact status bar and show detailed controls only when required.
