# AGENTS.md — AI Agent Core Rules

> **Version:** 2.0 | **Language:** English | **Scope:** Universal (copy to any project)
> For detailed methodology, SPDD templates, and tool usage protocols, see `AGENTS_EXTENDED.md`.

---

## 0. Mandatory Session Start

**Before writing a single line of code**, read these files in order — from disk, never from memory:

```
1. AGENTS.md          → rules and discipline (this file)
2. <MASTER_PLAN>      → project vision, users, business logic
3. PROGRESS.md        → current state, completed work, open risks
4. TODOS.md           → active tasks and next steps
5. PLAN.md            → active feature design and REASONS prompt
```

> `<MASTER_PLAN>` varies by project (e.g. `LEIMA_APP_MASTER_PLAN.md`, `README.md`). This step is never skippable.

**For small fixes / continuing in-progress work:** Read `TODOS.md` + the specific file being changed. The full 5-file read is required only for new features or new sessions.

---

## 1. Git Workflow

- **Never commit directly to `main`.** Every feature, table, or screen gets its own branch (e.g. `feature/auth-flow`, `fix/qr-race-condition`).
- **One feature per branch.** Keep branches focused and short-lived.
- **No broken code is committed.** Test before committing. Failing code stays local.
- **Merge → Delete.** After a successful merge to `main`, delete the feature branch immediately. Always branch from a fresh `main`.
- **Error recovery:** If a bad commit is made, use `git revert` (not `git reset --hard` on shared branches). Inform the user before reverting.

---

## 2. Phased Development

Parallel work across multiple layers (DB, mobile, admin) at the same time is not allowed. Progress follows the order defined in `PROGRESS.md` and the master plan.

**Phase order is preferred, not a hard lock.** If a defect in a previous phase is discovered during the current phase, fix it as a hotfix in the current branch and document it in `PROGRESS.md`.

---

## 3. Progress Tracking

- All completed work goes into **`PROGRESS.md`** with a date.
- Before finishing or handing off, update the **"Latest Agent Handoff"** section in `PROGRESS.md`.
- Handoff notes must include: date, branch, what was done, why, validation status, next recommended step, open risks.
- Handoff notes are current-state summaries — not changelogs.

---

## 4. Required Working Docs

Maintain these three files throughout every feature branch:

| File | Purpose |
|------|---------|
| `REVIEW.md` | Analyze before coding: affected files, risks, dependencies, existing similar logic |
| `PLAN.md` | Design before coding: architecture decisions, alternatives considered, edge cases, REASONS prompt |
| `TODOS.md` | Small, sequential, verifiable tasks. Update checkboxes as you go. Never leave too many items "in progress" simultaneously. |

When work is complete: `PROGRESS.md` captures the outcome and handoff. The three working docs hold the actionable context of the last task.

---

## 5. Code Quality — Project-Specific Rules

> Global code style rules (strict typing, no `any`, no silent failures, DRY/KISS/YAGNI, pure functions, no fallbacks) are enforced via the global user rules and are not repeated here.

**Rules that apply specifically to this project's architecture:**

- **Zero Trust / RLS:** Never trust the client. Hiding a UI button is not security. Enforce Row Level Security policies in the database and authorization checks inside every Edge Function.
- **Concurrency & Race Conditions:** For any operation where simultaneous requests are possible (e.g. stamp scanning, reward claiming, event registration), use atomic database RPCs, row-level locks, or unique constraints. Never use application-level locks.
- **N+1 Queries:** Never query the database inside a loop. Fetch all needed data with a single join/select.
- **Meaningful Error Codes:** APIs must return structured, named error codes (e.g. `QR_EXPIRED`, `ALREADY_STAMPED`). The frontend must map these to correct UI states (loading, error, success). No generic 500 errors.
- **Focused Changes:** Only touch files related to the requested feature. Do not refactor unrelated code without explicit instruction.

---

## 6. Compact Guard (Long Session Protection)

> **Problem:** After context compression (compact), the agent hallucinates — it "remembers" things it no longer has in context, producing confident but wrong output.

**If you suspect a compact has occurred, STOP and:**

1. Re-read the 5 mandatory files from disk (§0).
2. Re-read the current file you were editing — do not assume your previous changes are there.
3. Find the last completed step in `TODOS.md` and resume from there.

**Hallucination risk signals — stop and re-read if you notice:**

- Assuming a variable, function, or endpoint exists without seeing it in the current file.
- "I wrote this earlier" reasoning without reading the file.
- Uncertainty about where the task left off.
- Forgetting a decision made earlier in the same session.

**Active prevention:**

- After every 5 meaningful steps, re-read `TODOS.md` and verify completed items.
- Always read a file's current state before editing it.
- Decide based on "the file says X", not "I think X".
- When uncertain, ask the user — guessing is not allowed.

---

## 7. Multi-Agent & Tool Usage

**When multiple agents work on the same project:**

- Each agent works on a separate branch. Never two agents on the same branch simultaneously.
- Agents must read `PROGRESS.md` before starting to detect conflicts.
- Merge conflicts are resolved on a dedicated `merge/` branch before touching `main`.

**Tool selection principles:**

- Read schema/structure from migration files and source code — not from live dashboard.
- Prefer `rg` (ripgrep) for code search over `grep` or manual browsing.
- Use browser tools only when visual verification or UI interaction is required.
- For API testing, use `curl` with explicit flags. Document the exact command used in `TODOS.md`.
- If a tool call fails after 3 retries with appropriate backoff, raise the error to the user — do not silently fall back.

---

## 8. Quality Gates

A feature is **not complete** until all gates pass:

| Gate | Requirement |
|------|-------------|
| **Compilation** | No TypeScript errors, no lint warnings on changed files |
| **Functional test** | The specific feature works end-to-end (curl / device / browser) |
| **Edge cases** | At least the obvious failure paths are manually verified |
| **Docs updated** | `TODOS.md` checkboxes complete, `PROGRESS.md` updated with handoff note |
| **Branch clean** | No leftover debug logs, commented-out code, or TODO comments in committed code |

> CI/CD pipeline (if present) must pass. If there is no pipeline, the agent runs the project's lint and test commands manually before declaring done.

---

## Project Identity (Fill per project)

> Replace this section when copying to a new project.

- **Project:** `[PROJECT_NAME]`
- **Users:** `[WHO USES IT AND HOW]`
- **Stack:** `[INFRA + MOBILE/WEB + DB]`
- **Key concepts:** `[CRITICAL DOMAIN TERMS]`
- **Source of truth:** `[MASTER_PLAN_FILENAME.md]`
- **Extended rules:** See `AGENTS_EXTENDED.md` for SPDD methodology and REASONS prompt templates.
