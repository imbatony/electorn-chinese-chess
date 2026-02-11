# Quickstart: 棋谱保存与加载

**Date**: 2026-02-10  
**Feature**: 001-game-record-save-load

## Prerequisites

- Node.js (version matching project's .nvmrc or package.json engines)
- npm
- Windows OS (engine binaries are Windows-only)

## Setup

```bash
# Clone and checkout feature branch
git checkout 001-game-record-save-load

# Install dependencies (no new dependencies needed)
npm install

# Run in development mode
npm start
```

## Development Workflow

### 1. Run Tests (TDD — write tests first)

```bash
# Run all tests
npm test

# Run specific test file
npx jest test/GameRecord.test.ts

# Run with coverage
npm run test-c
```

### 2. Lint & Format

```bash
npm run lint
npm run format
```

### 3. Build Check

```bash
# Type check
npx tsc --noEmit

# Package build
npm run package
```

## Key Files to Modify/Create

| File | Action | Purpose |
|------|--------|---------|
| `src/common/GameRecord.ts` | Create | GameRecord interface + validation |
| `src/common/PgnExporter.ts` | Create | PGN format serialization |
| `src/common/IPCInfos.ts` | Modify | Add save/load/export IPC channels |
| `src/main/GameRecordService.ts` | Create | File I/O: save, load, validate, auto-save |
| `src/main/ipc.ts` | Modify | Register new IPC handlers |
| `src/main/menu.ts` | Modify | Add save/load/export menu items |
| `src/main/index.ts` | Modify | Auto-save lifecycle, recovery on startup |
| `src/renderer/Board.tsx` | Modify | Playback mode, continue logic |
| `src/renderer/hooks/index.ts` | Modify | Extend useFEN for loaded game records |
| `src/renderer/components/PlaybackBar.tsx` | Create | Playback navigation UI |
| `test/GameRecord.test.ts` | Create | Serialization/validation tests |
| `test/GameRecordService.test.ts` | Create | File I/O tests |
| `test/PgnExporter.test.ts` | Create | PGN export tests |

## Testing Strategy

### Unit Tests (test-first)

1. **GameRecord validation**: Valid/invalid JSON, FEN verification, ICCS format, schema version
2. **PGN export**: Header generation, move sequence formatting, result mapping
3. **GameRecordService**: Save/load round-trip, file size limits, corrupt file handling
4. **useFEN extensions**: Load from GameRecord, playback navigation, continue from position

### Manual Integration Tests

1. Start a game → play moves → save → verify JSON file content
2. Load saved game → navigate forward/back → verify board state
3. Load game → continue playing → save → verify merged history
4. Force-close app → restart → verify auto-save recovery prompt
5. Export PGN → open in third-party chess software

## Architecture Notes

- **All file I/O in main process**: Electron security best practice. Renderer never touches filesystem directly.
- **IPC-first**: New menu actions follow existing pattern: menu → IPC event → renderer callback → IPC invoke → main process file operation.
- **No new dependencies**: Uses Node.js `fs` (via main process), `electron.dialog`, and `electron.app.getPath()`. All available in existing Electron setup.
- **User data directory**: `app.getPath('userData')` → `%APPDATA%/飞将象棋/save/` on Windows.
