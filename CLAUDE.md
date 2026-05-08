# Mini Channel Talk — Claude Code Instructions

This is a 3-day take-home project for the Channel Talk FDE position.

## Project Context

The Korean SaaS company Channel Talk has a take-home assignment to build a "Mini Channel Talk." This repo is the implementation. Evaluation criteria explicitly state that decision-making process matters more than code quality.

## Working Documents (Local Only)

Working documents are in `/DOCS` (gitignored — local-only working files):

- `DOCS/PRD.md` — what we're building, scope, success criteria
- `DOCS/SPEC.md` — **single source of truth for technical implementation.** Database schema, type definitions, API contracts, component specs, key behaviors.
- `DOCS/ACTION_PLAN.md` — sequential execution playbook with task-by-task prompts
- `DOCS/DECISION.md` — full decision log with rationale (the "why" behind everything)

**Before implementing any feature, read the relevant section of `DOCS/SPEC.md`.**

When the user references "Spec §X.Y" or "Action Plan Task X.Y," look it up in DOCS.

## Stack & Conventions (Locked)

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript strict (no `any` without justification)
- **Styling:** Tailwind CSS only (no CSS files)
- **Backend:** Supabase (Postgres + Realtime)
- **Hosting:** Vercel
- **Package manager:** pnpm

**Do not introduce new libraries without explicit ask.** Stack is locked per Spec §1.

## Code Style

- Server Components by default; `'use client'` only when state/effect needed
- Server Actions for mutations preferred over REST when fitting
- File naming: kebab-case
- Component naming: PascalCase
- Function naming: camelCase

## Project Structure (per Spec §2)

Already specified in `DOCS/SPEC.md` §2. Adhere to it.

## What This Project Is NOT

Per Spec §14, do NOT build:
- Multi-device merge
- File upload
- Mobile native
- Multi-workspace
- Full team chat
- Phone/Meet
- Multi-channel adapters
- E2E tests
- RLS policies (we use Service Role from server only)

If asked to build something not in DOCS/SPEC.md, ask the user before proceeding.

## How to Work With Me

When the user says "Task X.Y 진행해" (or equivalent), follow this loop:

1. **Look up the task in `DOCS/ACTION_PLAN.md`.** Use the `Prompt` block under that task as the brief, and read every Spec section it references.
2. **Implement minimally** — don't add features beyond the prompt. No new libs without explicit ask.
3. **Run the `Verify` checklist from ACTION_PLAN — but only the parts I can do myself.**
   - Auto-verify: `pnpm tsc --noEmit`, `pnpm build`, `pnpm lint`, file existence, source inspection against Spec, SQL through the Supabase client when relevant.
   - Hand off to the user: anything requiring a real browser (DevTools cookies/localStorage, visual UI checks, Realtime cross-tab behavior, multi-incognito flows, Supabase Studio inspection if I lack access). List those checks explicitly with the exact steps the user should run, and wait for confirmation.
4. **If auto-verify fails, fix and re-verify.** Don't claim done until it's green.
5. **When verify is green (auto + user-confirmed where applicable), commit.** Each commit includes:
   - The code changes for the task
   - Context updates (DOCS/ACTION_PLAN.md progress checkmarks, DOCS/DECISION.md §7.2 online trade-off log entries when a real trade-off was made, CLAUDE.md instruction updates if rules changed)
   - A scoped message (e.g., `feat(lib): Task 1.1 — Supabase clients, types, anon-id`)
   Stage code + context together so each commit is a self-contained "task complete + docs current" checkpoint.
6. **Brief end-of-task note:** what changed, any deviations from Spec, any ambiguous decisions made, and any user-side verifications still pending.

When stuck or uncertain: ask before guessing. Surface trade-offs explicitly so they land in `DOCS/DECISION.md` §7.2.

## Time Pressure Context

This is a 15-20 hour project across 3 days. Prefer correctness + clarity over cleverness. The goal is the demo scenario in PRD §3 working end-to-end, not exhaustive feature coverage.

## Note for Future Readers (post-take-home)

If you cloned this repo and don't see `/DOCS`, that's expected — those are work-in-progress documents kept local during development. Final deliverable docs are submitted separately to the hiring team.