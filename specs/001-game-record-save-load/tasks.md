# Tasks: 棋谱保存与加载

**Input**: Design documents from `/specs/001-game-record-save-load/`  
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and directory structure

- [X] T001 Create save directory structure by ensuring `{userData}/save/` and `{userData}/autosave/` paths are initialized in main process
- [X] T002 [P] Verify existing Electron + TypeScript configuration supports new files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T003 Create GameRecord interface with GameMetadata, PlayerInfo, MoveEntry, GameResult types in src/common/GameRecord.ts
- [X] T004 Implement GameRecord validation utilities (FEN validation, ICCS format check, schema version) in src/common/GameRecord.ts
- [X] T005 Add IPC channel constants (OP_SAVE, OP_LOAD, OP_EXPORT, AutoSave channels, CheckDirtyKey) in src/common/IPCInfos.ts
- [X] T006 Add IPC request/response interfaces (SaveRequest, SaveResponse, LoadResponse, ExportRequest, ExportResponse, AutoSaveRequest, CheckDirtyResponse) in src/common/IPCInfos.ts
- [X] T007 Create GameRecordService class skeleton with save/load/validate method signatures in src/main/GameRecordService.ts
- [X] T008 Implement directory initialization (create save/ and autosave/ folders on app start) in src/main/GameRecordService.ts

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - 保存当前对局棋谱 (Priority: P1) 🎯 MVP

**Goal**: Allow users to save the current game record to a local JSON file via menu or keyboard shortcut

**Independent Test**: Play a few moves, trigger save, verify JSON file is created with correct FEN and moves array

### Implementation for User Story 1

- [X] T009 [US1] Implement GameRecordService.save() method with file dialog and JSON write in src/main/GameRecordService.ts
- [X] T010 [US1] Implement GameRecordService.buildGameRecord() to construct GameRecord from current game state in src/main/GameRecordService.ts
- [X] T011 [US1] Add save:execute IPC handler using ipcMain.handle in src/main/ipc.ts
- [X] T012 [US1] Add OP_SAVE menu trigger IPC handler in src/main/ipc.ts
- [X] T013 [US1] Add "保存棋谱" menu item with Ctrl+S accelerator to 文件 menu in src/main/menu.ts
- [X] T014 [US1] Add save operation trigger handling in renderer via ipcRenderer.on(OP_SAVE) in src/renderer/Board.tsx
- [X] T015 [US1] Implement collectGameRecord() function to gather current FEN array and metadata in src/renderer/Board.tsx
- [X] T016 [US1] Add save success/error toast notification in renderer in src/renderer/Board.tsx
- [X] T017 [US1] Extend BoardStatus interface with moveCount and isPlaybackMode fields in src/common/IPCInfos.ts

**Checkpoint**: User Story 1 complete - users can save games to JSON files

---

## Phase 4: User Story 2 - 加载历史棋谱并回顾 (Priority: P2)

**Goal**: Allow users to load a saved game file and navigate through moves with playback controls

**Independent Test**: Load a pre-saved JSON file, verify board shows initial position, use forward/back controls to step through moves

### Implementation for User Story 2

- [X] T018 [US2] Implement GameRecordService.load() method with file dialog and JSON read in src/main/GameRecordService.ts
- [X] T019 [US2] Implement GameRecordService.validateRecord() for complete record validation in src/main/GameRecordService.ts
- [X] T020 [US2] Add load:execute IPC handler using ipcMain.handle in src/main/ipc.ts
- [X] T021 [US2] Add OP_LOAD menu trigger IPC handler in src/main/ipc.ts
- [X] T022 [US2] Add "加载棋谱" menu item with Ctrl+O accelerator to 文件 menu in src/main/menu.ts
- [X] T023 [US2] Create PlaybackBar component with forward/back/jump-to-start/jump-to-end buttons in src/renderer/components/PlaybackBar.tsx
- [X] T024 [US2] Add PlaybackBar styling (positioned at bottom of board) in src/renderer/components/PlaybackBar.tsx
- [X] T025 [US2] Extend useFEN hook to accept optional GameRecord for playback mode initialization in src/renderer/hooks/index.ts
- [X] T026 [US2] Add playback navigation functions (goToMove, goForward, goBack, goToStart, goToEnd) to useFEN hook in src/renderer/hooks/index.ts
- [X] T027 [US2] Add isPlaybackMode state and setPlaybackMode function to useFEN hook in src/renderer/hooks/index.ts
- [X] T028 [US2] Integrate PlaybackBar into Board.tsx with conditional rendering when in playback mode in src/renderer/Board.tsx
- [X] T029 [US2] Add load operation trigger handling in renderer via ipcRenderer.on(OP_LOAD) in src/renderer/Board.tsx
- [X] T030 [US2] Highlight current move position in playback mode (visual indicator for current step) in src/renderer/components/HintLayer.tsx

**Checkpoint**: User Story 2 complete - users can load and review saved games

---

## Phase 5: User Story 3 - 从已加载棋谱继续对局 (Priority: P3)

**Goal**: Allow users to continue playing from any position in a loaded game record

**Independent Test**: Load a game, navigate to a middle position, click "继续对局", verify normal gameplay resumes and subsequent moves are recorded

### Implementation for User Story 3

- [X] T031 [US3] Add "继续对局" button to PlaybackBar component in src/renderer/components/PlaybackBar.tsx
- [X] T032 [US3] Implement continueFromPosition() function in useFEN hook to exit playback mode and enable gameplay in src/renderer/hooks/index.ts
- [X] T033 [US3] Handle history truncation when continuing from mid-game position (discard moves after current index) in src/renderer/hooks/index.ts
- [X] T034 [US3] Update Board.tsx to switch from playback mode to active game mode when continuing in src/renderer/Board.tsx
- [X] T035 [US3] Ensure new moves after continue are appended to the truncated history in src/renderer/hooks/index.ts
- [X] T036 [US3] Re-enable AI/opponent move handling after exiting playback mode in src/renderer/Board.tsx

**Checkpoint**: User Story 3 complete - users can resume gameplay from any loaded position

---

## Phase 6: User Story 4 - 导出棋谱为标准格式分享 (Priority: P4)

**Goal**: Allow users to export game records in PGN format for sharing with other chess software

**Independent Test**: Export a game to PGN, open the file in a third-party Chinese chess application

### Implementation for User Story 4

- [X] T037 [P] [US4] Create PgnExporter class with toPgn() method signature in src/common/PgnExporter.ts
- [X] T038 [US4] Implement PGN header generation (Game, Date, Red, Black, Result, FEN) in src/common/PgnExporter.ts
- [X] T039 [US4] Implement PGN move sequence formatting (numbered moves with ICCS notation) in src/common/PgnExporter.ts
- [X] T040 [US4] Implement GameResult to PGN result conversion (red_win→1-0, black_win→0-1, draw→1/2-1/2, incomplete→*) in src/common/PgnExporter.ts
- [X] T041 [US4] Implement GameRecordService.export() method with file dialog and PGN write in src/main/GameRecordService.ts
- [X] T042 [US4] Add export:execute IPC handler using ipcMain.handle in src/main/ipc.ts
- [X] T043 [US4] Add OP_EXPORT menu trigger IPC handler in src/main/ipc.ts
- [X] T044 [US4] Add "导出PGN" menu item with Ctrl+E accelerator to 文件 menu in src/main/menu.ts
- [X] T045 [US4] Add export operation trigger handling in renderer via ipcRenderer.on(OP_EXPORT) in src/renderer/Board.tsx

**Checkpoint**: User Story 4 complete - users can export games in standard PGN format

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Auto-save, recovery, and quality improvements that span multiple user stories

### Auto-Save Functionality (Edge Cases)

- [X] T046 [P] Implement GameRecordService.autoSave() method to write to autosave/autosave.json in src/main/GameRecordService.ts
- [X] T047 [P] Implement GameRecordService.checkAutoSave() method to detect existing auto-save on startup in src/main/GameRecordService.ts
- [X] T048 [P] Implement GameRecordService.discardAutoSave() method to delete auto-save file in src/main/GameRecordService.ts
- [X] T049 Add auto-save timer (30 second interval) setup in main process on game start in src/main/index.ts
- [X] T050 Add autosave:write IPC handler in src/main/ipc.ts
- [X] T051 Send game state to main process for auto-save on each move in src/renderer/Board.tsx
- [X] T052 Add auto-save recovery check on application startup in src/main/index.ts
- [X] T053 Implement recovery prompt dialog when auto-save detected in src/main/index.ts
- [X] T054 Add autosave:check, autosave:recover, autosave:discard IPC handlers in src/main/ipc.ts

### Unsaved Progress Warning (Edge Cases)

- [X] T055 Add dirty flag state tracking in renderer (true on move, false on save) in src/renderer/Board.tsx
- [X] T056 Add game:check-dirty IPC handler to query dirty state in src/main/ipc.ts
- [X] T057 Intercept before-quit event to check dirty state and prompt save in src/main/index.ts
- [X] T058 Add unsaved progress warning when loading new game while dirty in src/renderer/Board.tsx

### File Validation & Error Handling (Edge Cases)

- [X] T059 Add file size validation (reject files > 10 MB) in GameRecordService.load() in src/main/GameRecordService.ts
- [X] T060 Add detailed error messages for corrupt/invalid files in GameRecordService.validateRecord() in src/main/GameRecordService.ts
- [X] T061 Handle file-in-use errors with retry option in GameRecordService.save() in src/main/GameRecordService.ts

### Documentation

- [X] T062 Update README.md with new save/load/export feature documentation
- [ ] T063 Run quickstart.md validation to verify all manual integration tests pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - US1 (P1) should complete first as MVP
  - US2-US4 can proceed in priority order after US1
- **Polish (Phase 7)**: Can start after US1 is complete, but primarily after US2

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1
- **User Story 3 (P3)**: Depends on User Story 2 (requires playback mode infrastructure)
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - Independent of US1-US3

### Within Each User Story

- IPC channel definitions before handlers
- Main process handlers before renderer integration
- Menu items after IPC handlers are ready
- Core implementation before UI integration

### Parallel Opportunities

**Phase 2 (Foundational)**:
- T003 + T004 can run in parallel (same file, different functions)
- T005 + T006 can run in parallel (same file, constants vs interfaces)
- T007 + T008 sequential (same file, skeleton then implementation)

**Phase 3 (US1)**:
- T009 + T010 sequential (same file)
- T011 + T012 can run in parallel with T013
- T014 + T015 + T016 sequential (same file)

**Phase 6 (US4)**:
- T037-T040 sequential (same file)
- T041-T044 can start after T040

**Phase 7 (Polish)**:
- T046 + T047 + T048 can run in parallel (same file, different methods)
- T055 + T056 can run in parallel (different files)

---

## Parallel Example: User Story 1

```bash
# After Phase 2 complete, launch US1 tasks:

# Group 1: Main process implementation (sequential)
Task T009: Implement GameRecordService.save() method
Task T010: Implement GameRecordService.buildGameRecord() method

# Group 2: IPC handlers (can start in parallel with Group 1)
Task T011: Add save:execute IPC handler
Task T012: Add OP_SAVE menu trigger IPC handler

# Group 3: Menu (after Group 2)
Task T013: Add "保存棋谱" menu item

# Group 4: Renderer integration (after Group 1 + 2)
Task T014: Add save operation trigger in renderer
Task T015: Implement collectGameRecord()
Task T016: Add save notifications
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test save functionality independently
5. Demo/validate MVP

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test save independently → **MVP Complete!**
3. Add User Story 2 → Test load/playback independently
4. Add User Story 3 → Test continue functionality independently
5. Add User Story 4 → Test PGN export independently
6. Add Phase 7 → Auto-save, recovery, polish

### Suggested MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 (User Story 1)**

This delivers:
- Complete save functionality
- JSON file format
- Menu integration with Ctrl+S
- Foundation for subsequent stories

Estimated tasks: 17 tasks (T001-T017)

---

## Notes

- All file I/O in main process (Electron security best practice)
- No new npm dependencies required (uses Node.js fs, Electron dialog)
- User data directory: `app.getPath('userData')` → `%APPDATA%/飞将象棋/`
- Commit after each task or logical group
- Run `npm run lint` and `npm test` after each phase
