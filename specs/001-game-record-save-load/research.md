# Research: 棋谱保存与加载

**Date**: 2026-02-10  
**Feature**: 001-game-record-save-load

## R1: User Data Directory Strategy

**Decision**: Use `electron.app.getPath('userData')` with a `save/` subfolder for all game record files (manual saves, auto-saves).

**Rationale**: This is the standard Electron convention. On Windows, userData resolves to `%APPDATA%/飞将象棋/` (productName from package.json). Creating a `save/` subfolder keeps game records organized and separate from other app data. Both the save and load dialogs default to this directory.

**Alternatives considered**:
- Documents folder (`app.getPath('documents')`) — rejected because game saves are app-specific, not user documents
- Custom path in app installation directory — rejected because it requires write permissions and may conflict with Windows security

**Implementation detail**: 
- Save path: `{userData}/save/`
- Auto-save path: `{userData}/autosave/`
- Directory creation on first use via `fs.mkdirSync(path, { recursive: true })`

## R2: JSON Game Record Format

**Decision**: Use a well-defined JSON schema for native game record files.

**Rationale**: JSON is natively supported by TypeScript/Node.js with zero dependencies. It's human-readable, extensible, and easy to validate. The Fen.ts class already tracks FEN strings and ICCS move sequences, which serialize cleanly to JSON.

**Alternatives considered**:
- Binary format — rejected per spec clarification (readability required)
- XML — rejected as overly verbose for the simple data structure needed
- Direct PGN as native format — rejected because PGN lacks structured metadata fields needed for app state (game mode, side types, auto-save markers)

## R3: PGN Chinese Chess Export Format

**Decision**: Use standard PGN format with Chinese chess piece notation and ICCS coordinate system.

**Rationale**: PGN is the most widely supported text-based chess format. The Chinese chess variant uses the same structure with adapted piece letters (K/A/B/N/R/C/P). Standard headers: Event, Site, Date, Red, Black, Result. Move text uses ICCS notation.

**Reference**: PGN specification at https://www.xqbase.com/protocol/pgn.htm

## R4: Auto-Save Mechanism

**Decision**: Timer-based auto-save in the main process, triggered every 30 seconds during active gameplay. The renderer sends game state updates to main process on every move; main process writes to auto-save file.

**Rationale**: Main process owns file I/O in Electron's security model. Using the existing `BoardStatusKey` IPC pattern, the renderer already sends FEN state on every move. The main process can maintain a buffer and flush to disk periodically.

**Alternatives considered**:
- Renderer-side localStorage — rejected because it doesn't persist reliably across crashes and violates Electron best practices
- Save on every move — rejected as excessive I/O for a desktop app
- Node.js worker thread — rejected as over-engineering for a simple file write

## R5: File Dialog Integration

**Decision**: Use `electron.dialog.showSaveDialog()` and `electron.dialog.showOpenDialog()` from the main process, invoked via IPC.

**Rationale**: `electron.dialog` is not available in the renderer process (contextIsolation is off but dialog is main-process only). The dialog calls are already async and return the selected file path. Default directory set to `{userData}/save/`.

**Implementation detail**:
- Save dialog filters: `[{ name: '棋谱文件', extensions: ['json'] }]`
- Load dialog filters: `[{ name: '棋谱文件', extensions: ['json'] }, { name: 'PGN棋谱', extensions: ['pgn'] }, { name: '所有文件', extensions: ['*'] }]`
- Default path: `app.getPath('userData') + '/save/'`

## R6: Playback Mode Architecture

**Decision**: Extend the existing `useFEN` hook to support a "playback mode" where the full move history is loaded from file and the index can traverse the entire sequence. Add a boolean `isPlaybackMode` flag.

**Rationale**: The current `useFEN` hook already uses an `fenArray[]` + `index` pattern that naturally supports forward/backward navigation. Loading a saved game populates the full fenArray at initialization. The `push()` function already supports appending moves when continuing from a position.

**Key change**: The `useFEN` hook currently initializes with a single FEN. It needs to accept an optional pre-built FEN array + move history for playback mode.

## R7: Unsaved Progress Warning

**Decision**: Track a `dirty` flag in the renderer that becomes `true` on any move and resets on save. Check this flag before loading a new game or on the `before-quit` event.

**Rationale**: Simple boolean state is sufficient — there's no need for complex diff tracking. The main process can intercept the close event and send an IPC message to the renderer to check the dirty flag, then show a native dialog.
