# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-03
- **Branch:** `feature/organizer-profile-rls-keyboard-polish`
- **Goal:** Remove organizer profile cover update RLS failures and polish Finnish copy plus keyboard-safe editing.

## Architectural Decisions

- Add an idempotent Supabase migration that recreates club profile update and event-media storage policies.
- Let only club owners/organizers or platform admins update club profile rows and upload/update/delete media under the matching club storage folder.
- Keep `event-media` select public because event covers/logos are user-visible public assets.
- Fix Finnish organizer profile labels from Turkish/incorrect text to natural Finnish.
- Wrap the shared app screen and club event date/time modal in keyboard-aware containers.

## Edge Cases

- Malformed storage paths must evaluate false instead of throwing.
- Existing public media URLs must remain readable.
- Date/time modal must remain scrollable on small screens when the keyboard is open.
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
  - `npx supabase@2.95.4 db push`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
