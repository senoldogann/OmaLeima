# AGENTS_EXTENDED.md — AI Agent Extended Protocols

> **Purpose:** Detailed methodology, prompt templates, and advanced protocols for AI Agents.
> This is a companion document to `AGENTS.md`.

---

## 1. SPDD — Structured Prompt-Driven Development

> **Core Principle:** Define what to do, how to do it, and the constraints *before* writing any code. Prompt engineering is a primary development artifact.

This project adopts the SPDD approach. **Prompts are first-class development assets.** They are versioned like code, accumulate value, and are reused in subsequent iterations.

### Development Cycle

Every task goes through these three phases:

```
BUSINESS GOAL  →  STRUCTURED PROMPT  →  CODE & TESTS
      ↑                                      |
      └──── accumulated prompt + code ───────┘
              (carried to next iteration)
```

1. **Business Goal:** What are you doing and why? Define the business need and target clearly.
2. **Structured Prompt:** Before generating code, write the prompt using the REASONS template (below).
3. **Code & Tests:** Only proceed to code generation after the first two steps are complete.

### REASONS Prompt Template

When writing a prompt for a feature, use this structure:

| Letter | Meaning | Description |
|--------|---------|-------------|
| **R** | Role | The expert role the agent assumes (e.g., "Supabase Edge Function security expert") |
| **E** | End Goal | What exactly will be produced? Define the concrete output. |
| **A** | Architecture | Which pattern, structure, or layer will be used? (e.g., Controller→Service→Repository) |
| **S** | Scope | What will it do, and what will it *strictly not* do? Draw the boundaries. |
| **O** | Output Format | TypeScript? SQL? Which file? Are type definitions included? |
| **N** | Negative Constraints | What must NOT be done? (e.g., no `any` type, no fallbacks, no mocks) |
| **S** | Standards | Code style, security rules, RLS requirements from `AGENTS.md` and global rules. |

### Bad vs. Good Prompt Example

❌ **Bad:** `"Write a scan-qr edge function"`

✅ **Good (REASONS applied):**
```
Role: You are a Supabase security expert.
End Goal: An Edge Function that atomically validates a QR token and adds a stamp.
Architecture: Single PostgreSQL RPC call (to prevent race conditions), JWT user validation.
Scope: Only the scan-qr function — do not touch QR generation or reward flows.
Output Format: TypeScript in supabase/functions/scan-qr/index.ts, with full type definitions.
Negative Constraints: No `any` type, no silent error swallowing, no fallback behavior.
Standards: Follow AGENTS.md security rules, use existing _shared/cors.ts.
```

### Prompt Asset Accumulation

- The REASONS prompt for each feature is stored under the `## Prompt` heading in **`PLAN.md`**.
- In the next iteration, when building a similar feature, this prompt template is used as a starting point and refined.
- Prompts are versioned alongside code commits; the answer to "why was this written this way?" is found in the prompt.

---

## 2. Advanced Tool Usage Protocols

Agents operate in a rich environment with various tools (MCP, browser, terminal, file system). Following strict protocols prevents destructive actions and ensures accuracy.

### Information Gathering
1. **Source Code > Live State:** Always prefer reading schema definitions, migration files, and type definitions directly from the source code over querying a live database or dashboard, unless investigating a specific production bug.
2. **Precision Searching:** Use `rg` (ripgrep) or semantic search tools for exploring the codebase instead of generic `grep` or manual file browsing.
3. **Check KI Summaries:** Always check Knowledge Items (KIs) before starting research to avoid redundant work.

### Execution & Testing
1. **Terminal Commands:** Prefer non-interactive commands with explicit flags over interactive ones.
2. **API Verification:** Use `curl` with explicit flags (e.g., `-X POST`, `-H`, `-d`) for API testing. Document the exact `curl` command used in `TODOS.md` for reproduceability.
3. **Browser Automation:** Use browser subagents *only* when visual verification, UI interaction, or End-to-End flow testing is required. Do not use it for simple API checks.

### Error Handling & Retries
- **No Silent Fallbacks:** If a tool call fails, analyze the error. Do not silently fall back to an alternative approach without understanding the root cause.
- **Retry Limit:** If a specific approach (e.g., a complex git command or an API call) fails after 3 attempts with appropriate adjustments, **STOP** and raise the error to the user. Ask for clarification or intervention.

---

## 3. Advanced Error Recovery Procedures

When mistakes happen (e.g., editing the wrong file, breaking a test, making a bad commit), agents must follow these steps:

1. **Acknowledge the Error:** Explicitly state the error in the thought process or response.
2. **Assess the Damage:** Use `git status` and `git diff` to see exactly what changed.
3. **Revert Actions:**
   - Uncommitted changes: Use `git restore <file>` or discard specific chunks.
   - Bad commits (local only): Use `git reset --soft HEAD~1` to undo the commit but keep changes, or `git revert <commit-hash>` if shared.
4. **Inform the User:** Before executing destructive commands (like `git reset --hard` or deleting files you didn't just create), ask the user for permission.
5. **Re-evaluate:** After recovery, re-read the relevant files (`TODOS.md`, `PLAN.md`) to re-orient before attempting the task again.

---

## 4. Multi-Agent Collaboration

When multiple agents work on the same repository concurrently:

1. **Strict Branch Isolation:** Agents must operate on separate branches. Two agents must *never* work on the same feature branch simultaneously.
2. **State Synchronization:** Before starting a task, an agent must read `PROGRESS.md` to understand what other agents have completed or are currently working on.
3. **Conflict Resolution:** If merge conflicts arise when integrating features, they must be resolved on a dedicated integration branch (e.g., `merge/feature-a-and-b`) before merging into `main`. The agent should carefully compare both implementations and prefer manual merging over forced overrides.
