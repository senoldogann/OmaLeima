# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-02
- **Branch:** `feature/product-ops-roadmap-assets`
- **Goal:** Decide the correct next product architecture for event-day scanning, organizer mobile, announcements, and security, then make OmaLeima visual assets more evenly used across mobile/admin image surfaces.

## Architectural Decisions

- Treat low-friction scanning as an operations problem, not just a camera component problem.
- Keep QR security server-owned: short TTL, atomic RPC, event/venue limits, scanner identity, device identity, and audit logs stay mandatory.
- Add future convenience through event-day scanner mode, trusted venue devices, optional staff PIN/device pairing, queue-optimized UI, NFC/static checkpoint options where appropriate, and manual recovery lanes.
- Add `/club` mobile as its own role area for organizers and club staff. Do not route pure club accounts into `/business`.
- Split announcement work into platform announcements and organizer announcements. Both need audience targeting, expiry, read receipts, and moderation; organizer push also needs explicit student subscription or event registration consent.
- Use imagegen for additional repo-owned event/QR/reward visuals, then wire them only through the existing centralized event fallback image list in this slice.
- Keep generated visuals free of readable text, QR codes, brand marks, and scannable data so they can safely appear behind localized UI copy.
- Use gravity-line backgrounds only through shared shell primitives. Do not paste decorative background code into every screen.
- Prefer explicit fallback purposes for major surfaces so login, discovery, QR, rewards, leaderboard, scanner, and admin shell do not all reuse the same first image.
- Do not stage or modify user-owned local script changes or editor metadata.

## Alternatives Considered

- Let pure `CLUB_ORGANIZER` accounts into `/business/home` immediately:
  - rejected because organizer accounts manage clubs/events, not business venue scanner profiles, unless they also have an active `business_staff` membership
- Make businesses scan with a public static QR:
  - rejected as the primary flow because it reverses trust and makes fraud/replay much easier unless paired with signed checkpoint sessions and server-side limits
- Implement announcements immediately without docs:
  - rejected because push/announcement systems are high-risk for spam, consent, and trust; the data model should be explicit first
- Replace all event photos at once:
  - rejected because existing event-cover rotation is already centralized and can absorb new assets safely without touching every UI component
- Add hard-coded per-screen background images everywhere:
  - rejected because it would make future visual tuning brittle and would duplicate styling across routes

## Edge Cases

- Event-day flow must work when the venue is busy, staff changes mid-shift, or a scanner device loses connection.
- Announcement popups must not block emergency app use forever; they need dismiss/read state and expiry.
- Push announcements must respect user consent and event/organizer scope.
- Typecheck, lint, and export/build must stay green for affected apps.
- The generated hero asset must not contain readable text, logos, or external brand marks.
- The generated gravity-line backgrounds must preserve text contrast in both dark and light themes.
- Admin accounts can remain web-first. Organizer mobile access should be added only with its own screens and permission model.

## Validation Plan

- Run:
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
- `npm --prefix apps/mobile run export:web`
- `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
