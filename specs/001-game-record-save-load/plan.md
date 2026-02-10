# Implementation Plan: 棋谱保存与加载

**Branch**: `001-game-record-save-load` | **Date**: 2026-02-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-game-record-save-load/spec.md`

## Summary

Add game record save/load functionality to the Chinese chess application. Users can manually save the current game to a JSON file, auto-save games periodically to prevent crash data loss, load saved games for review with playback controls, continue playing from any loaded position, and export to PGN format. Files default to the application's user data directory under a `save/` subfolder, consistent with standard Electron app conventions.

## Technical Context

**Language/Version**: TypeScript 4.x  
**Primary Dependencies**: Electron 17.x, React 17.x, react-konva, @electron/remote, lodash  
**Storage**: Local filesystem — JSON files for native format, PGN text files for export. User data directory via `electron.app.getPath('userData')` with `save/` subfolder. Auto-save to same user data directory.  
**Testing**: Jest (existing `test/` directory)  
**Target Platform**: Windows (desktop, Electron)  
**Project Type**: Electron desktop app (main + renderer process architecture)  
**Performance Goals**: Save < 2s, Load < 3s, Playback navigation ≥ 2 moves/sec, ≥ 30 fps canvas rendering maintained  
**Constraints**: Memory < 512 MB, app startup < 3s, auto-save interval 30s, file size limit 10 MB for load  
**Scale/Scope**: Single-user desktop app, typical game records < 500 moves

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Code Quality | ✅ PASS | All new code will use strict TypeScript, functional components with Hooks, single-responsibility functions ≤ 80 lines. No `any` types. |
| II. Test Discipline | ✅ PASS | Tests written before implementation (Red-Green-Refactor). New modules target ≥ 80% coverage. Game record serialization/deserialization is highly testable. |
| III. Performance Metrics | ✅ PASS | Save/load operations target < 2-3s. No impact on canvas rendering (file I/O is async in main process). Memory well within 512 MB limit. |
| IV. User Experience Continuity | ✅ PASS | No existing UI elements removed or relocated. New menu items added to existing "文件" and "操作" menus. Existing keyboard shortcuts preserved. |
| Quality Standards | ✅ PASS | Lint, test, build, type gates will be satisfied. No new dependencies required (Electron APIs + Node.js fs suffice). |
| Development Workflow | ✅ PASS | New IPC channels defined in IPCInfos.ts first. Conventional Commits used. README updated with new feature. |

**Gate Result**: ALL PASS — proceeding to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-game-record-save-load/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (IPC contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── main/
│   ├── index.ts              # (modify) Add auto-save lifecycle hooks, recovery check on startup
│   ├── ipc.ts                # (modify) Add save/load/export IPC handlers
│   ├── menu.ts               # (modify) Add save/load/export menu items
│   └── GameRecordService.ts  # (new) File I/O service: save, load, validate, auto-save, export PGN
├── renderer/
│   ├── Board.tsx             # (modify) Add playback mode, continue-from-position logic
│   ├── hooks/
│   │   └── index.ts          # (modify) Extend useFEN for loading external game records
│   └── components/
│       └── PlaybackBar.tsx   # (new) Playback controls UI (forward/back/jump)
├── common/
│   ├── IPCInfos.ts           # (modify) Add save/load/autosave/export IPC channel definitions
│   ├── GameRecord.ts         # (new) GameRecord interface and validation utilities
│   └── PgnExporter.ts        # (new) PGN format serialization for Chinese chess

test/
├── GameRecord.test.ts        # (new) GameRecord serialization/deserialization tests
├── GameRecordService.test.ts # (new) File I/O service tests
└── PgnExporter.test.ts       # (new) PGN export format tests
```

**Structure Decision**: Follows existing Electron main/renderer/common split. New files placed in their natural process boundary. `GameRecordService.ts` in main process handles all file I/O (Electron security best practice). `GameRecord.ts` in common for shared types. Playback UI as a new component to keep Board.tsx manageable.

## Complexity Tracking

> No constitution violations — no entries needed.
