# PLAN.md

Bu dosya her yeni feature branch'te koddan once tasarimi netlestirmek icin kullanilir.

## Current Plan

- **Date:** 2026-04-29
- **Branch:** `feature/native-simulator-smoke-pass`
- **Goal:** Finish the last honest pre-device layer: simulator/emulator smoke readiness, concise operator guidance, and a minimal remaining physical-device checklist.

## Architectural Decisions

- Keep simulator/emulator work separate from real remote push claims. The output should say what is validated locally and what still needs a physical device.
- Reuse the existing profile diagnostics surface and readiness gates instead of inventing another debug route.
- Add one focused audit/wrapper for native simulator smoke if the current gates do not yet describe that state clearly enough.
- Prefer concise runbook guidance over more product UI; this slice is mostly about operational clarity and repeatability.

## Alternatives Considered

- Pretending simulator/emulator can fully replace the last physical push step:
  - rejected because Expo’s current guidance still requires a real device for honest remote push confirmation
- Shipping a large end-to-end automation harness for every local machine:
  - rejected because simulator/emulator availability is environment-specific and brittle as a default repo gate
- Doing nothing and only answering in chat:
  - rejected because the user explicitly asked us to handle as much as possible inside the repo first

## Edge Cases

- A developer may have only Android tools or only iOS tools available. The guidance should degrade cleanly by platform.
- A simulator or emulator may not be booted when we run local checks. Repo gates must stay read-only and environment-agnostic.
- The final manual checklist must stay short enough that the user can actually follow it without wading through Expo docs again.
- Existing readiness audits must continue to pass unchanged.

## Validation Plan

- Use relevant Expo / iOS / Android plugin capabilities when available to inspect the local native-smoke path.
- Run `apps/mobile` lint, typecheck, export, and any new simulator-smoke audit.
- Re-run the current native push, reward notification, and realtime audits so the new guidance layer does not regress existing readiness.
- Get a reviewer pass if the repo change goes beyond docs-only clarification.
