# Data Model: 棋谱保存与加载

**Date**: 2026-02-10  
**Feature**: 001-game-record-save-load

## Entities

### GameRecord (棋谱)

The primary data object representing a complete or partial game session.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| version | string | yes | Schema version for forward compatibility (e.g., "1.0") |
| metadata | GameMetadata | yes | Game session metadata |
| initialFen | string | yes | FEN string of the starting position |
| moves | MoveEntry[] | yes | Ordered sequence of all moves played |
| currentIndex | number | yes | Index of the last viewed/played move (for resume) |

**Validation rules**:
- `initialFen` MUST pass `FEN.verifyFEN()` (existing validator)
- `moves` array MAY be empty (game just started, no moves yet)
- `currentIndex` MUST be `>= 0` and `<= moves.length`
- `version` MUST be a semver-compatible string

### GameMetadata (对局元数据)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| date | string | yes | ISO 8601 date of the game (e.g., "2026-02-10T06:21:00Z") |
| redPlayer | PlayerInfo | yes | Red side player information |
| blackPlayer | PlayerInfo | yes | Black side player information |
| result | GameResult | no | Game outcome (omitted if incomplete) |
| gameMode | string | yes | Game mode identifier (e.g., "human-vs-ai", "human-vs-human", "ai-vs-ai") |
| appVersion | string | no | Application version that created this record |

### PlayerInfo (玩家信息)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| type | "human" \| string | yes | "human" or engine key name (e.g., "ELEEYE", "CYCLONE") |
| name | string | no | Display name (defaults to type label) |

### MoveEntry (着法记录)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| iccs | string | yes | Move in ICCS notation (e.g., "h2e2") |
| fen | string | yes | Resulting board position after this move (FEN string) |
| index | number | yes | 1-based move sequence number |

**Validation rules**:
- `iccs` MUST be a valid 4-character ICCS string (matches `/^[a-i]\d[a-i]\d$/`)
- `fen` MUST pass `FEN.verifyFEN()`
- `index` MUST equal position in array + 1

### GameResult (对局结果)

Enum string: `"red_win"` | `"black_win"` | `"draw"` | `"incomplete"`

## State Transitions

```
[No Record] ──save──► [Saved on Disk]
     │                      │
     │                   load│
     ▼                      ▼
[Active Game] ◄─continue─ [Playback Mode]
     │                      │
  auto-save              navigate
     │                   (fwd/back)
     ▼                      │
[Auto-Save File]            ▼
     │              [Viewing Position N]
  app crash                 │
     │               continue from N
     ▼                      │
[Recovery Prompt] ─yes──► [Active Game]
     │
    no
     ▼
[Discard Auto-Save]
```

## File System Layout

```
{userData}/
├── save/              # Manual saves (user-selected filenames)
│   ├── game_2026-02-10.json
│   └── my-opening-study.json
└── autosave/          # Auto-save (single rotating file)
    └── autosave.json
```

## Sample JSON File

```json
{
  "version": "1.0",
  "metadata": {
    "date": "2026-02-10T06:21:00Z",
    "redPlayer": { "type": "human" },
    "blackPlayer": { "type": "ELEEYE", "name": "象眼" },
    "result": "incomplete",
    "gameMode": "human-vs-ai"
  },
  "initialFen": "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w",
  "moves": [
    { "iccs": "h2e2", "fen": "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C2C3C/9/RNBAKABNR b", "index": 1 },
    { "iccs": "b9c7", "fen": "r1bakabnr/9/1cn4c1/p1p1p1p1p/9/9/P1P1P1P1P/1C2C3C/9/RNBAKABNR w", "index": 2 }
  ],
  "currentIndex": 2
}
```

## PGN Export Format

```pgn
[Game "Chinese Chess"]
[Date "2026.02.10"]
[Red "Human"]
[Black "象眼"]
[Result "*"]
[FEN "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w"]

1. h2e2 b9c7
```

**PGN Result values**: `1-0` (red win), `0-1` (black win), `1/2-1/2` (draw), `*` (incomplete)
