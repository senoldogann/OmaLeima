# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/hosted-business-scan-smoke-readiness`
- **Goal:** Let one physical iPhone run the hosted student-to-scanner smoke path end to end without extra hardware, while keeping the helper surfaces development-only.

## Architectural Decisions

- Keep the helper in JavaScript and behind `__DEV__` so the already-installed development build can pick it up from Metro without another iOS build.
- Reuse the existing student QR query result instead of adding a second fetch or a new backend endpoint.
- Reuse the existing manual scanner fallback path instead of adding a second scanner transport or a debug-only API route.
- Add a repository-owned audit plus docs so the hosted same-device smoke path does not live only in chat history.

## Alternatives Considered

- Building a separate debug route just for hosted scanner smoke:
  - rejected because the active-event screen already owns the live token and the scanner screen already owns the manual fallback
- Exposing the raw QR token in all builds:
  - rejected because production users should never see the JWT payload directly
- Solving the same-device smoke only with docs:
  - rejected because the user still needs a practical way to move the current token from the student flow into the scanner flow on one phone

## Edge Cases

- The helper should appear only while a live QR token exists for an active event.
- The helper must stay hidden in exported or production builds.
- The scanner hint should not claim that manual paste replaces the real camera scan path; it only exercises the same backend contract.
- The hosted scanner account copy should align with the real hosted fixture account and stop calling it a local seed.

## Validation Plan

- Run mobile `lint`, `typecheck`, and `export:web`.
- Run a new focused audit for the hosted business scan smoke wiring.
- Keep the new copy aligned in `apps/mobile/README.md`, `docs/TESTING.md`, and the handoff docs.
