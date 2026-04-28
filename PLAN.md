# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/reward-unlocked-remote-push-delivery-and-device-smoke`
- **Goal:** Ship the smallest honest remote `REWARD_UNLOCKED` push delivery path after successful scans, plus deterministic local smoke coverage and updated readiness docs.

## Architectural Decisions

- Detect unlock boundaries inside `scan_stamp_atomic` by comparing the post-insert valid stamp count against the previous count.
- Return unlock metadata from the RPC so `scan-qr` can build a remote push attempt without re-querying business rules from scratch.
- Keep scan success authoritative. Remote push transport or token problems should be reflected in extra response metadata and persisted notification status, not by turning the scan into a retry-triggering error.
- Use one grouped push payload per successful scan and student, even when multiple reward tiers unlock together.
- Reuse the existing Expo push helper and `notifications` persistence style instead of adding a new dedicated Edge Function.

## Alternatives Considered

- Detecting unlocked tiers in `scan-qr` with broad reward tier reads after the RPC:
  - rejected because it duplicates atomic business logic and makes later race analysis worse
- Sending one notification row per unlocked reward tier:
  - rejected because this slice only needs one push event per scan and would overcomplicate delivery/result bookkeeping
- Turning remote push failure into `502` from `scan-qr`:
  - rejected because the stamp would already exist, making scanner retries misleading and noisy

## Edge Cases

- Multiple reward tiers can unlock on the same stamp if they share the same required threshold.
- A student can already have a `CLAIMED` or `REVOKED` reward claim; those tiers must not be sent as newly unlocked.
- A reward can cross the stamp threshold while already out of stock; the scan should not send a false unlock push for that tier.
- The local mock push server has to bind on the host because the function runtime reaches it through `host.docker.internal`.
- Real remote push confirmation still requires a development build on physical devices, so docs must stay explicit about that gap.

## Validation Plan

- Run the new reward-unlocked push smoke against local functions with the host mock Expo server.
- Run `apps/mobile` lint, typecheck, and current reward-notification audits so the previous local bridge stays aligned with the new backend story.
- Run focused docs/readiness validation from the root wrapper if a new QA command is added.
- Get a reviewer pass because the most likely mistakes here are duplicate unlock sends and scan-result honesty regressions.
