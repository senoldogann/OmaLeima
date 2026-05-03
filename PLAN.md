# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/business-scanner-role-policy-review`
- **Goal:** Make scanner permissions understandable, verify business/club policy intent, and show event venues/leima status properly to students.

## Architectural Decisions

- Keep business profile editing limited to business `OWNER` and `MANAGER`; do not allow `SCANNER` to edit identity/media.
- Add clear read-only copy and a direct event-management/scanner shortcut for scanner accounts.
- Extend student event venue read model to fetch business logo/cover and the current student's valid/manual-review stamp rows for the event.
- Render joined businesses as richer cards with collected/pending state.
- Treat the organizer RLS issue as a smoke-test/data-role issue unless a concrete failing policy is found; previous owner/organizer policies are retained.

## Edge Cases

- If the student is not registered, venue rows can still show public venue list but stamp status remains pending.
- `VALID` and `MANUAL_REVIEW` stamps count as collected display; `REVOKED` does not.
- Scanner role sees events through `/business/events`, but profile fields stay disabled.
- Local unrelated changes must remain untouched.

## Ordered Follow-Up Queue

1. Announcement follow/subscription preferences and read receipt analytics.
2. Pass return/reward handout operations for haalarimerkki pickup.
3. Scanner PIN reset audit review in admin/club tools if operators need central oversight.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `npx supabase@2.95.4 db lint --linked`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
