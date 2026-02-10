# Feature Specification: 棋谱保存与加载

**Feature Branch**: `001-game-record-save-load`  
**Created**: 2026-02-10  
**Status**: Draft  
**Input**: User description: "棋谱保存/加载 — 支持保存对局记录和加载历史棋谱"

## Clarifications

### Session 2026-02-10

- Q: 标准导出格式应采用哪种中国象棋棋谱标准？ → A: PGN 中国象棋变体（.pgn），文本格式，桌面象棋软件广泛支持
- Q: 崩溃恢复时应如何与用户交互？ → A: 弹出提示对话框，询问用户是否恢复上次未保存的对局
- Q: 应用原生棋谱文件应采用什么格式？ → A: JSON 格式，结构化、可扩展、调试友好

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 保存当前对局棋谱 (Priority: P1)

玩家在进行一局象棋对弈时（无论是人机对战还是人人对战），希望能够将当前对局的完整记录保存到本地文件，以便日后回顾或继续对局。玩家通过菜单或快捷键触发保存操作，选择保存位置和文件名后，系统将对局信息写入文件。

**Why this priority**: 保存功能是棋谱管理的基础。没有保存能力，加载和回顾功能毫无意义。这是最小可行产品的核心。

**Independent Test**: 可以通过走几步棋后触发保存操作，验证文件是否生成且内容完整来独立测试。保存的文件应包含完整的初始局面和所有着法记录。

**Acceptance Scenarios**:

1. **Given** 玩家正在进行一局人机对战且已走了若干步棋, **When** 玩家点击菜单中的"保存棋谱"选项, **Then** 系统弹出文件保存对话框，玩家选择位置后，对局记录被保存为文件
2. **Given** 玩家在对局中触发保存操作, **When** 保存成功, **Then** 系统显示保存成功的提示信息，文件包含初始局面 FEN、所有着法序列、对局双方信息和对局时间
3. **Given** 玩家在对局中触发保存操作, **When** 文件写入失败（如磁盘空间不足）, **Then** 系统显示友好的错误提示，当前对局不受影响

---

### User Story 2 - 加载历史棋谱并回顾 (Priority: P2)

玩家希望能够从本地文件加载之前保存的棋谱，在棋盘上还原对局并逐步回顾每一步走法。加载后，玩家可以浏览整局对弈过程，前进或后退查看每步走棋。

**Why this priority**: 加载功能与保存功能互补，使棋谱保存变得有意义。玩家可以回顾历史对局、学习和复盘。

**Independent Test**: 可以通过加载一个预先准备好的合法棋谱文件，验证棋盘是否正确还原、着法是否可以逐步浏览来独立测试。

**Acceptance Scenarios**:

1. **Given** 玩家处于应用主界面, **When** 玩家点击菜单中的"加载棋谱"选项并选择一个有效的棋谱文件, **Then** 系统在棋盘上还原对局初始局面，并允许玩家逐步浏览每一步着法
2. **Given** 玩家已加载一个棋谱, **When** 玩家使用前进/后退控件, **Then** 棋盘依次展示每步走棋，着法高亮显示当前步骤
3. **Given** 玩家选择加载棋谱, **When** 选择的文件格式无效或内容损坏, **Then** 系统显示明确的错误提示，说明文件无法识别，当前棋盘状态不受影响

---

### User Story 3 - 从已加载棋谱继续对局 (Priority: P3)

玩家加载一个未完成的历史棋谱后，希望能够从某一步开始继续与AI或另一位玩家对弈，而不仅仅是回顾。

**Why this priority**: 在保存和加载的基础上提供续弈能力，适用于中断后恢复对局的场景，提升用户体验的完整性。

**Independent Test**: 可以通过加载一个未结束的棋谱文件，跳转到最后一步后触发"继续对局"，验证后续走棋是否正常运作来独立测试。

**Acceptance Scenarios**:

1. **Given** 玩家已加载一个未完成的棋谱并浏览到最后一步, **When** 玩家选择"继续对局", **Then** 系统切换到正常对弈模式，玩家可以从当前局面继续走棋
2. **Given** 玩家在回顾模式中跳转到棋谱中间某一步, **When** 玩家选择"从此处继续", **Then** 系统从该局面开始新的对弈，后续的历史着法被丢弃
3. **Given** 玩家从加载的棋谱继续对弈并走了新的棋步, **When** 玩家再次保存, **Then** 新的棋谱文件包含完整的对局历史（包括原始记录和新增着法）

---

### User Story 4 - 导出棋谱为标准格式分享 (Priority: P4)

玩家希望能够将棋谱导出为行业标准格式（如 PGN-中国象棋变体），以便在其他象棋软件中打开或与棋友分享。

**Why this priority**: 标准格式兼容性扩大了应用的实用性，但不是核心功能，依赖于保存/加载基础设施。

**Independent Test**: 可以通过导出棋谱后在第三方象棋软件中尝试打开来验证格式兼容性。

**Acceptance Scenarios**:

1. **Given** 玩家已完成或正在进行一局对弈, **When** 玩家选择"导出棋谱", **Then** 系统以标准格式生成棋谱文件，包含对局元数据和完整着法记录
2. **Given** 玩家选择导出, **When** 导出完成, **Then** 文件包含符合规范的头部信息（红方、黑方、日期、结果等）和着法序列

---

### Edge Cases

- 当棋谱文件在保存过程中被其他程序占用时，系统应提示文件被占用并允许重试或选择其他位置
- 当加载的棋谱中包含非法着法（如走法违反规则）时，系统应在加载时验证并提示哪一步存在问题
- 当用户尝试加载超大文件（非棋谱文件）时，系统应有合理的文件大小检查，避免内存溢出
- 当用户在对局进行中加载新棋谱时，系统应提示当前对局未保存，询问是否先保存
- 当应用意外关闭时，系统应自动保存当前对局的临时记录（自动存档）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to save the current game record to a local file via menu action or keyboard shortcut
- **FR-002**: System MUST save the complete game state in JSON format including: initial board position (FEN), full move sequence (ICCS notation), player information (red/black side type), and timestamp
- **FR-003**: System MUST allow users to load a previously saved game record file from the local filesystem
- **FR-004**: System MUST validate the integrity of loaded game files before displaying them, checking FEN validity and move legality
- **FR-005**: System MUST provide step-by-step playback controls (forward, backward, jump to start, jump to end) when viewing a loaded game record
- **FR-006**: System MUST highlight the current move being viewed during playback, clearly showing which piece moved and its path
- **FR-007**: System MUST allow users to continue playing from any position in a loaded game record
- **FR-008**: System MUST warn users about unsaved progress when loading a new game record or closing the application during an active game
- **FR-009**: System MUST support exporting game records in PGN Chinese chess variant format (.pgn), which is a text-based standard widely supported by desktop Chinese chess software
- **FR-010**: System MUST display a file selection dialog using the operating system's native dialog for both save and load operations
- **FR-011**: System MUST auto-save the current game state periodically to a temporary location to prevent data loss from unexpected crashes
- **FR-012**: System MUST restore auto-saved games when the application restarts after an unexpected shutdown by displaying a prompt dialog asking the user whether to recover the last unsaved game or start fresh

### Key Entities

- **Game Record (棋谱)**: Represents a complete game session. Contains initial board position, ordered sequence of moves, game metadata (date, player types, result), and game mode (human vs AI, etc.)
- **Move Entry (着法记录)**: Represents a single move within a game record. Contains the move notation, the resulting board position, and the move sequence number
- **Game Metadata (对局元数据)**: Supplementary information about a game session including date/time of play, red player identity, black player identity, game result (red win, black win, draw, incomplete), and game mode

## Assumptions

- The application's native file format uses JSON (.json) for human readability, extensibility, and native compatibility with the TypeScript codebase
- Standard export format is PGN Chinese chess variant (.pgn), a text-based format widely supported by desktop Chinese chess applications
- Auto-save interval defaults to every 30 seconds during active gameplay
- Auto-save files are stored in the application's user data directory and cleaned up after successful manual save or game completion
- File size limit for loading is set to 10 MB, which is far beyond any reasonable game record size
- The playback controls reuse the existing undo/redo infrastructure (useFEN hook) already present in the codebase

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can save a complete game record in under 2 seconds from triggering the save action
- **SC-002**: Users can load and display a saved game record in under 3 seconds
- **SC-003**: 100% of legally played games can be round-tripped (saved then loaded) with no data loss — every move is preserved exactly
- **SC-004**: Users can navigate through a loaded game record using playback controls at a rate of at least 2 moves per second
- **SC-005**: Auto-save recovers the last game state when the application restarts after a crash, with no more than 30 seconds of gameplay lost
- **SC-006**: Exported standard-format files are successfully opened by at least one other major Chinese chess application
