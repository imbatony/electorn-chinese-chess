# IPC Contracts: 棋谱保存与加载

**Date**: 2026-02-10  
**Feature**: 001-game-record-save-load

All new IPC channels MUST be defined in `src/common/IPCInfos.ts` with TypeScript interfaces per Constitution §Development Workflow item 3.

## New IPC Channels

### 1. OP_SAVE — Save Game Record

**Channel**: `op:save`  
**Direction**: Main → Renderer (menu trigger) + Renderer → Main (data + file path)  
**Type**: `ipcMain.handle` (async, returns result)

**Flow**:
1. User clicks "保存棋谱" menu item → main sends `op:save` event to renderer
2. Renderer gathers current game state → invokes `save:execute` with GameRecord data
3. Main shows `dialog.showSaveDialog()` with default path `{userData}/save/`
4. Main writes file, returns success/failure

```typescript
// Channel key
export const OP_SAVE = 'op:save';
export const SaveExecuteKey = 'save:execute';

// Renderer → Main payload
export interface SaveRequest {
  record: GameRecord;
}

// Main → Renderer response
export interface SaveResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}
```

### 2. OP_LOAD — Load Game Record

**Channel**: `op:load`  
**Direction**: Main → Renderer (menu trigger) + Main → Renderer (loaded data)  
**Type**: `ipcMain.handle` (async, returns GameRecord or error)

**Flow**:
1. User clicks "加载棋谱" menu item → main sends `op:load` event to renderer
2. Renderer checks dirty flag → if dirty, prompts "save first?" via IPC
3. Main shows `dialog.showOpenDialog()` with default path `{userData}/save/`
4. Main reads + validates file → returns GameRecord to renderer
5. Renderer loads into useFEN hook in playback mode

```typescript
// Channel key
export const OP_LOAD = 'op:load';
export const LoadExecuteKey = 'load:execute';

// Main → Renderer response
export interface LoadResponse {
  success: boolean;
  record?: GameRecord;
  error?: string;
}
```

### 3. OP_EXPORT — Export to PGN

**Channel**: `op:export`  
**Direction**: Main → Renderer (menu trigger) + Renderer → Main (data)  
**Type**: `ipcMain.handle` (async)

```typescript
// Channel key
export const OP_EXPORT = 'op:export';
export const ExportExecuteKey = 'export:execute';

// Renderer → Main payload
export interface ExportRequest {
  record: GameRecord;
}

// Main → Renderer response  
export interface ExportResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}
```

### 4. AutoSave Channels

**Channel**: `autosave:write` / `autosave:check` / `autosave:recover` / `autosave:discard`

```typescript
// Auto-save write (Renderer → Main, periodic)
export const AutoSaveWriteKey = 'autosave:write';
export interface AutoSaveRequest {
  record: GameRecord;
}

// Auto-save recovery check (Main → Renderer on startup)
export const AutoSaveCheckKey = 'autosave:check';
export interface AutoSaveCheckResponse {
  hasAutoSave: boolean;
  record?: GameRecord;
  timestamp?: string;
}

// Auto-save recovery decision
export const AutoSaveRecoverKey = 'autosave:recover';
export const AutoSaveDiscardKey = 'autosave:discard';
```

### 5. Dirty State Check

**Channel**: `game:check-dirty`

```typescript
// Main → Renderer (before quit or load)
export const CheckDirtyKey = 'game:check-dirty';

// Renderer → Main response
export interface CheckDirtyResponse {
  isDirty: boolean;
}
```

## Modified Existing Channels

### BoardStatusKey Enhancement

The existing `BoardStatus` interface is extended to include game mode information needed for save operations:

```typescript
export interface BoardStatus {
  curFen: string;
  canBack: boolean;
  isEnd: boolean;
  // New fields:
  moveCount: number;       // Total moves played
  isPlaybackMode: boolean; // Whether viewing a loaded game
}
```

## Menu Structure Changes

### 文件 (File) menu — add items:

| Label | Accelerator | Channel | Condition |
|-------|-------------|---------|-----------|
| 保存棋谱 | Ctrl+S | OP_SAVE | Game active (moves > 0) |
| 加载棋谱 | Ctrl+O | OP_LOAD | Always enabled |
| 导出PGN | Ctrl+E | OP_EXPORT | Game active (moves > 0) |
| — (separator) | | | |
| (existing close items) | | | |
