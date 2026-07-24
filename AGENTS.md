# Repository guide

## Project

飞将象棋 is a Windows-focused Electron application written in TypeScript for
Node.js 22 or newer. It uses React 17 and react-konva in the renderer, Electron
Forge with Webpack for builds, and Jest for tests.

## Layout

- `src/main/`: Electron main process, native dialogs, file I/O, menus, and engine
  processes.
- `src/renderer/`: React UI, board rendering, interaction, animation, and sound.
- `src/common/`: process-independent chess rules, data models, and IPC contracts.
- `test/`: Jest tests.
- `assets/`: images, sounds, and bundled Windows chess engines.

Keep `src/common/` free of Electron and DOM dependencies. Define IPC channel names
and payload types in `src/common/IPCInfos.ts` instead of using string literals.

## Working approach

1. Read the relevant code and make the smallest complete change.
2. For a small or well-defined task, implement it directly. Write a short plan only
   when the work is ambiguous or spans several independent steps.
3. Do not create specs, checklists, task documents, or other process artifacts
   unless the user explicitly requests them.
4. Reuse existing modules and patterns before adding abstractions or dependencies.
5. Add or update focused tests when changing chess rules, engine communication,
   game-record handling, or other testable behavior.
6. Review the final diff and run the smallest checks that cover the change.

User-visible text should be Chinese and use established Chinese chess terminology.
Comments should explain non-obvious rationale rather than restate the code.

## Commands

- Install: `npm install`
- Run locally: `npm start`
- Format check: `npm run format:check`
- Lint: `npm run lint`
- Test: `npm test`
- Package: `npm run package`
- Production installer: `npm run make:prod`

Run a focused Jest file while iterating when possible. Run `npm run package` for
behavioral changes to the main process or IPC and for build or packaging changes.
Engine-related changes also require a manual check on Windows with a real UCI or
UCCI engine.

Do not edit generated output in `.webpack/`, `out/`, or `dist/`, and do not modify
bundled engine databases as part of unrelated work.
