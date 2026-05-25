# Phase 1 — Pattern Map

**Status:** Greenfield project — no existing code analogs to map.

> The pattern mapper produces analog file references for new file creations by pointing at the closest existing files in the codebase. Phase 1 of GroupCoordinator has no prior code; this file is intentionally minimal.

---

## Greenfield bootstrap

For canonical setup patterns for every file the planner will create in Phase 1, the source of truth is:

- `.planning/phases/01-spine-plan-lifecycle/01-RESEARCH.md` §Bootstrap Order (13-step sequence)
- `.planning/research/ARCHITECTURE.md` §Recommended Project Structure
- `.planning/research/STACK.md` §Installation
- `.planning/research/ARCHITECTURE.md` §Data Model + §Permission Model

These three documents define the directory layout, file naming conventions, and integration points for all Phase 1 surfaces.

## Planner directive

For every file the plan creates, the planner should reference RESEARCH.md §Bootstrap Order or ARCHITECTURE.md §Recommended Project Structure in the task's `<read_first>` field — NOT a (non-existent) analog file in this repo.

After Phase 1 ships, Phase 2+ will be able to use real analog files; PATTERNS.md will then contain meaningful entries.
