# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-05-04
- **Branch:** `feature/media-storage-business-scanner-fixes`
- **Goal:** Make uploaded media actually readable and lock scanner-only accounts to scanner duties.

## Architectural Decisions

- Use `ArrayBuffer` for Supabase Storage upload bodies and reject zero-byte reads before calling Storage.
- Verify the generated public URL after upload with a HEAD request so broken public policies or empty objects fail immediately.
- Share the upload body/verification logic across business profile media, club profile media, and club event covers.
- Add `staffRole` to business joined/opportunity summaries so the UI can distinguish owner/manager from scanner.
- Filter joinable opportunities to owner/manager memberships, hide leave actions for scanner memberships, and hide the manage section entirely for scanner-only accounts.
- Recreate join/leave RPCs with an explicit `role in ('OWNER','MANAGER')` check so modified clients cannot use scanner accounts for event management.
- Center single-card rails while preserving left-aligned multi-card rails.

## Edge Cases

- Existing zero-byte URLs remain invalid until the user re-uploads those specific images.
- Public URL verification must include the failing URL and status/content-length context in the error.
- A scanner attached to an already joined active event can still open scanner/history, but cannot join or leave events.
- A business with exactly one event in a rail should show the card centered; two or more cards should start from the left.

## Validation Plan

- Run:
  - `supabase db push`
  - `supabase migration list --linked`
  - `npm --prefix apps/mobile run typecheck`
  - `npm --prefix apps/mobile run lint`
  - `npm --prefix apps/mobile run export:web`
  - `git --no-pager diff --check`
- Record the handoff in `PROGRESS.md`.
