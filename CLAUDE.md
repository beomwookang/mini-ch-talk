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

When given a task:
1. Read the referenced Spec section first
2. Implement minimally — don't add features not asked for
3. After implementation, briefly note: what was changed, any deviations from Spec, anything ambiguous that needed assumption
4. Don't auto-commit; let the user review and commit

When stuck or uncertain:
- Ask before guessing
- Surface trade-offs explicitly so the user can record in DOCS/DECISION.md §7.2 (online trade-off log)

## Time Pressure Context

This is a 15-20 hour project across 3 days. Prefer correctness + clarity over cleverness. The goal is the demo scenario in PRD §3 working end-to-end, not exhaustive feature coverage.

## Note for Future Readers (post-take-home)

If you cloned this repo and don't see `/DOCS`, that's expected — those are work-in-progress documents kept local during development. Final deliverable docs are submitted separately to the hiring team.