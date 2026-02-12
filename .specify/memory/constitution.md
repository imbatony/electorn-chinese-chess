<!--
同步影响报告
=============
- 版本更改: N/A → 1.0.0 (初始创建)
- 添加的原则:
  - I. 代码质量优先
  - II. 测试纪律
  - III. 用户体验一致性
  - IV. 性能标准
  - V. 简洁架构
- 添加的部分:
  - 技术栈约束
  - 开发工作流程
  - 治理
- 删除的部分: 无
- 需要更新的模板:
  - .specify/templates/plan-template.md ✅ 已验证 (章程检查部分兼容)
  - .specify/templates/spec-template.md ✅ 已验证 (需求/成功标准兼容)
  - .specify/templates/tasks-template.md ✅ 已验证 (阶段结构兼容)
  - .specify/templates/checklist-template.md ✅ 已验证 (通用模板无需更新)
  - .specify/templates/agent-file-template.md ✅ 已验证 (通用模板无需更新)
- 延迟 TODO: 无
-->

# 飞将象棋 项目章程

## 核心原则

### I. 代码质量优先

- 所有源代码 MUST 使用 TypeScript 编写, 启用 `noImplicitAny` 严格类型检查.
  禁止使用 `any` 类型, 除非与第三方库交互且无法获取类型定义时,
  此时 MUST 添加 `// eslint-disable-next-line` 注释并说明理由.
- 代码提交前 MUST 通过 ESLint (`npm run lint`) 和
  Prettier (`npm run format:check`) 检查, 零错误零警告.
- 使用 Knip (`npm run knip`) 检测并移除未使用的导出、依赖和文件,
  保持代码库精简.
- 每个模块/文件 MUST 具有单一职责. 若一个文件超过 300 行,
  SHOULD 考虑拆分, 除非有明确的内聚性理由.
- 命名 MUST 清晰表达意图: 类名使用 PascalCase, 方法/变量使用
  camelCase, 常量使用 UPPER_SNAKE_CASE, 文件名与默认导出一致.

### II. 测试纪律

- 核心逻辑模块(common/ 目录下的棋子规则、FEN 解析、ICCS 转换、
  棋谱导出等) MUST 有对应的单元测试, 使用 Jest 编写.
- 新增或修改棋子走法规则时, MUST 同时更新或新增测试用例,
  覆盖正常走法、边界走法和非法走法.
- 引擎通信(UCCI 协议)的修改 MUST 有集成测试验证
  命令发送与响应解析的正确性.
- 测试 MUST 在 CI 流水线中通过才能合并. 本地可通过
  `npm test` 运行全部测试, `npm run test-c` 检查覆盖率.
- 关键模块(Fen、Pieces、UCCI)的测试覆盖率 SHOULD 维持在
  80% 以上; 新增代码的覆盖率 MUST 不低于 70%.

### III. 用户体验一致性

- 棋盘渲染 MUST 使用 Konva/react-konva 的 Canvas 方案,
  保持统一的图层架构: 背景层(ChessBoardBG) → 提示层(HintLayer)
  → 棋子层(PiecesLayer) → 操作层(OperationLayer).
- 走棋动画 MUST 使用 Animation 模块统一管理, 动画时长保持一致
  (默认 200ms), 避免不同场景下动画行为不统一.
- 音效反馈(走棋音、将军音、胜负音) MUST 通过 Sound 模块
  集中管理, 确保所有用户操作都有一致的听觉反馈.
- UI 布局 MUST 适配主窗口尺寸, 棋盘居中显示,
  命令栏(CommandBar)和回放栏(PlaybackBar)位置固定且风格统一.
- 用户可见文本 MUST 使用中文, 菜单项、对话框、提示信息的措辞
  SHOULD 简洁、专业, 与象棋术语规范一致.

### IV. 性能标准

- 棋盘渲染帧率 MUST 维持 60fps, Canvas 重绘不得造成可感知的卡顿.
  棋子移动动画期间, 主线程阻塞不得超过 16ms.
- 引擎通信 MUST 在独立子进程中运行(通过 UCCI 模块),
  禁止在主进程或渲染进程中执行引擎计算,
  避免阻塞用户交互.
- 应用启动到棋盘可交互 SHOULD 控制在 3 秒以内(冷启动).
- Electron 主进程内存占用 SHOULD 控制在 200MB 以内(正常对局状态).
- 棋谱文件(JSON 格式)的保存和加载操作 MUST 异步执行,
  不得阻塞渲染进程. 单次保存/加载操作 SHOULD 在 500ms 内完成.

### V. 简洁架构

- 严格遵循 Electron 的进程分离模型:
  `main/` 处理系统级操作(窗口管理、菜单、文件 I/O、引擎进程),
  `renderer/` 处理 UI 渲染和用户交互,
  `common/` 存放进程间共享的纯逻辑(棋子规则、FEN、ICCS 等).
- `common/` 目录下的代码 MUST 不依赖 Electron API、DOM API
  或任何进程特定的模块, 确保可独立测试.
- IPC 通信 MUST 通过 `IPCInfos.ts` 中定义的常量进行,
  禁止在代码中硬编码 IPC 事件名.
- 新增功能前 MUST 评估是否可以复用现有模块. 遵循 YAGNI 原则,
  不为假设的未来需求预先构建抽象.
- 第三方依赖的引入 MUST 经过评估: 包大小、维护状态、许可证兼容性
  (MIT 优先). 优先使用已有依赖解决问题.

## 技术栈约束

- **运行时**: Electron 28+ (Chromium + Node.js 22+)
- **语言**: TypeScript 5.x, 严格模式
- **前端框架**: React 17 + react-konva (Canvas 渲染)
- **构建工具**: Webpack + electron-forge
- **测试框架**: Jest 30 + ts-jest
- **代码质量**: ESLint + Prettier + Knip
- **目标平台**: Windows (受引擎二进制文件限制)
- **许可证**: MIT, 所有新增依赖 MUST 兼容 MIT 许可
- 技术栈升级(如 React 版本、Electron 版本) MUST 在独立分支中
  进行, 经充分测试后合并, 不得与功能开发混合提交.

## 开发工作流程

- 功能开发 MUST 在功能分支上进行, 分支命名格式:
  `feature/描述` 或 `fix/描述`.
- 代码提交前 MUST 依次通过: `npm run format:check` →
  `npm run lint` → `npm test`. 任一步骤失败则禁止提交.
- 提交信息 MUST 遵循约定式提交格式:
  `type(scope): description`, 其中 type 包括
  feat / fix / docs / style / refactor / test / chore.
- 引擎相关修改(UCCI 协议、引擎配置) MUST 在真实引擎环境下
  手动验证, 因引擎为外部二进制文件, 无法完全通过自动化测试覆盖.
- 发布构建 MUST 使用 `npm run make:prod` 生成生产环境包,
  并在目标平台上完成冒烟测试(启动、人机对局、棋谱保存/加载).

## 治理

- 本章程是飞将象棋项目所有技术决策和实施选择的最高指导文件.
  当章程原则与其他文档或实践冲突时, 以章程为准.
- 章程修正 MUST 遵循以下流程:
  1. 提出修正提案, 说明变更内容和理由.
  2. 更新章程文件, 递增版本号(遵循语义版本控制).
  3. 同步更新所有引用章程原则的模板和文档.
  4. 在提交信息中明确标注 `docs: amend constitution to vX.Y.Z`.
- 版本控制策略:
  - MAJOR: 原则删除或不兼容的重新定义.
  - MINOR: 新增原则或实质性扩展.
  - PATCH: 措辞澄清、拼写修复、非语义调整.
- 所有代码审查 MUST 验证变更是否符合章程原则.
  若变更违反原则, MUST 提供明确的豁免理由并记录在案.
- 复杂性引入 MUST 得到证明: 说明为什么更简单的替代方案不可行.
- 使用 `.specify/templates/agent-file-template.md`
  生成的开发指南进行运行时开发指导.

**版本**: 1.0.0 | **批准日期**: 2026-02-12 | **最后修正**: 2026-02-12
