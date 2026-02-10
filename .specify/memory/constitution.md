<!--
Sync Impact Report
===================
Version change: N/A → 1.0.0 (initial ratification)
Modified principles: N/A (initial creation)
Added sections:
  - Core Principles (4 principles)
  - Quality Standards (Section 2)
  - Development Workflow (Section 3)
  - Governance
Removed sections: N/A
Templates requiring updates:
  - .specify/templates/plan-template.md ✅ compatible (Constitution Check section present)
  - .specify/templates/spec-template.md ✅ compatible (Success Criteria supports performance metrics)
  - .specify/templates/tasks-template.md ✅ compatible (Phase structure supports test-first and polish phases)
Follow-up TODOs: None
-->

# 飞将象棋 Constitution

## Core Principles

### I. Code Quality

All source code MUST adhere to strict TypeScript typing; usage of `any`
is prohibited unless explicitly justified with a code comment. Every
module MUST pass ESLint and Prettier checks before merge. Functions
MUST be single-responsibility and MUST NOT exceed 80 lines of logic
(excluding imports, types, and comments). React components MUST be
functional components using Hooks; class components are not permitted
for new code.

**Rationale**: The codebase mixes Electron main-process, IPC, and
React renderer code. Strict typing and linting prevent cross-boundary
bugs that are expensive to debug at runtime.

### II. Test Discipline

Every bug fix and new feature MUST include at least one corresponding
test case in the `test/` directory using Jest. Tests MUST be written
before implementation (Red-Green-Refactor). All tests MUST pass in CI
before a pull request can be merged. Test coverage for changed files
MUST NOT decrease; new modules MUST have ≥ 80% line coverage.

**Rationale**: Chess logic (move validation, FEN parsing, ICCS
conversion) is highly combinatorial. Untested edge cases lead to
silent rule violations that erode trust in the application.

### III. Performance Metrics

Canvas rendering via react-konva MUST maintain ≥ 30 fps during piece
animations on the reference hardware (mid-range Windows PC, 8 GB RAM).
Engine communication round-trip (position → bestmove response) MUST
be measured and logged; any regression > 20% over baseline MUST be
investigated before release. Application startup (Electron ready
event) MUST complete within 3 seconds on reference hardware. Memory
usage MUST stay below 512 MB during normal gameplay.

**Rationale**: As a desktop game, perceived responsiveness directly
determines user satisfaction. Measurable thresholds prevent slow
degradation across releases.

### IV. User Experience Continuity

UI changes MUST NOT remove or relocate existing interactive elements
without a documented migration path and user notification (e.g.,
changelog entry or in-app hint). Audio feedback (move sounds,
background music toggle) MUST remain functional across updates.
The chessboard layout, piece artwork, and color scheme MUST remain
visually consistent unless a deliberate redesign is approved via
governance amendment. Keyboard and mouse interaction patterns MUST
NOT change between minor versions.

**Rationale**: Players build muscle memory and visual familiarity.
Breaking established interaction patterns frustrates the core user
base even when the underlying change is technically superior.

## Quality Standards

All pull requests MUST satisfy the following gates before merge:

- **Lint gate**: `npm run lint` exits with code 0.
- **Test gate**: `npm test` exits with code 0; no skipped tests
  without a linked tracking issue.
- **Build gate**: `npm run package` produces a working executable.
- **Type gate**: `tsc --noEmit` reports zero errors.
- **Review gate**: At least one maintainer approval required.

Dependency additions MUST be justified in the PR description with
rationale for why existing dependencies cannot fulfill the need.
Security advisories from `npm audit` at severity ≥ high MUST be
resolved before release.

## Development Workflow

1. **Branch strategy**: Feature branches from `main`; naming format
   `<issue-number>-<short-description>` (e.g., `42-add-undo-stack`).
2. **Commit messages**: Follow Conventional Commits format
   (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `perf:`).
3. **IPC changes**: Any new IPC channel MUST be defined in
   `src/common/IPCInfos.ts` with a TypeScript interface for its
   payload before implementation in main or renderer process.
4. **Engine integration**: New engines MUST be added to
   `assets/engine/` and registered in `src/common/constants.ts`;
   UCCI/UCI compatibility MUST be verified with at least one
   automated test exercising `position` → `go` → `bestmove`.
5. **Documentation**: User-facing feature additions MUST update the
   feature table in `README.md`.

## Governance

This constitution is the highest-authority document for the 飞将象棋
project. All code reviews, design decisions, and process changes MUST
comply with the principles above.

### Amendment Procedure

1. Propose an amendment via a pull request modifying this file.
2. The PR description MUST state which principles are affected and
   the rationale for change.
3. At least one maintainer MUST approve the amendment.
4. Upon merge, `CONSTITUTION_VERSION` MUST be incremented per
   semantic versioning:
   - **MAJOR**: Principle removal or incompatible redefinition.
   - **MINOR**: New principle or material expansion of guidance.
   - **PATCH**: Clarifications, wording, or non-semantic refinements.
5. `LAST_AMENDED_DATE` MUST be updated to the merge date.

### Compliance Review

Every pull request review SHOULD include a constitution compliance
check. Reviewers MUST flag violations of any Core Principle and
request changes before approval.

**Version**: 1.0.0 | **Ratified**: 2026-02-10 | **Last Amended**: 2026-02-10
