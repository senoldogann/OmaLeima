# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/business-manage-event-rail-preview`
- **Goal:** Make business event management visually scannable and ensure all public joinable events are discoverable.

## Architectural Decisions

- Keep `useBusinessHomeOverviewQuery` as the shared source for business home/events/scanner.
- Fetch joinable opportunities globally instead of by business city, because joining rules are enforced by RPC and city is a product hint, not a security rule.
- Preserve deduplication by `businessId:eventId` so events already joined by the business do not appear in joinable opportunities.
- Add event cover and description to business joined/opportunity summaries so UI cards and preview modal use the same event asset everywhere.
- Use horizontal rails for live/upcoming/joinable/past sections; use a modal for full event details.

## Edge Cases

- Joinable events outside the business city display their city on the card and modal.
- A live joined event keeps scanner/history actions.
- An upcoming joined event keeps leave action.
- A past joined event is visible but read-only.
- An event without a cover or description uses fallback imagery and a clear empty description sentence.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
