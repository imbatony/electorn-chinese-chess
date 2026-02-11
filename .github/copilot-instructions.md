# Copilot Instructions for 飞将象棋 (Chinese Chess)

## 项目概述

这是一个基于 **Electron** 开发的中国象棋桌面应用程序，名为"飞将象棋"。项目使用 TypeScript + React 技术栈构建，支持人机对战、人人对战和机器对战模式。

## 技术栈

- **运行时**: Electron 17.x
- **前端框架**: React 17.x + TypeScript 4.x
- **UI 渲染**: Konva (react-konva) - Canvas 2D 图形库
- **构建工具**: Webpack + Electron Forge
- **测试框架**: Jest
- **路由**: React Router DOM v6
- **包管理**: npm

## 项目结构

```
src/
├── main/           # Electron 主进程代码
│   ├── index.ts    # 主进程入口
│   ├── UCCI.ts     # UCCI/UCI 象棋引擎通信协议实现
│   ├── ipc.ts      # IPC 进程间通信
│   ├── menu.ts     # 应用菜单
│   └── feijiang.ts # 飞将检测逻辑
├── renderer/       # Electron 渲染进程代码 (React 应用)
│   ├── app.tsx     # React 应用入口
│   ├── Board.tsx   # 棋盘主组件
│   ├── components/ # React 组件
│   │   ├── ChessBoard.tsx    # 棋盘容器
│   │   ├── ChessBoradBG.tsx  # 棋盘背景
│   │   ├── PiecesLayer.tsx   # 棋子层
│   │   ├── HintLayer.tsx     # 提示层
│   │   └── OperationLayer.tsx # 操作层
│   └── hooks/      # 自定义 React Hooks
├── common/         # 主进程和渲染进程共享代码
│   ├── constants.ts   # 常量定义
│   ├── Fen.ts         # FEN 棋谱格式解析
│   ├── ICCS.ts        # ICCS 着法表示法
│   ├── IPCInfos.ts    # IPC 消息类型定义
│   ├── Pieces.ts      # 棋子管理
│   └── pieces/        # 各类棋子的走法规则
│       ├── BaseChess.ts  # 棋子基类
│       ├── King.ts       # 将/帅
│       ├── Advisor.ts    # 士/仕
│       ├── Bishop.ts     # 象/相
│       ├── Knight.ts     # 马
│       ├── Rook.ts       # 车
│       ├── Cannon.ts     # 炮
│       └── Pawn.ts       # 卒/兵
assets/
├── engine/         # 象棋引擎可执行文件
│   ├── ElephantEye/  # 象眼引擎
│   ├── cyclone/      # 旋风引擎
│   ├── gg20180531/   # 佳佳引擎
│   └── sachess1.6/   # 南奥引擎
├── audio/          # 音效文件
├── img/            # 图片资源
└── font/           # 字体文件
```

## 编码规范

### TypeScript/JavaScript

- 使用 TypeScript 严格模式，避免 `any` 类型
- 使用 ES6+ 语法特性
- 组件使用函数式组件 + Hooks
- 接口命名使用 PascalCase，以描述性名称命名
- 常量使用 UPPER_SNAKE_CASE
- 文件命名使用 PascalCase（组件）或 camelCase（工具类）

### React 组件

- 优先使用函数式组件和 React Hooks
- 使用 `React.FC` 类型定义组件
- 状态管理使用 React Context（见 `context.ts`）
- Canvas 渲染使用 react-konva 库

### Electron

- 主进程代码位于 `src/main/`
- 渲染进程代码位于 `src/renderer/`
- 进程间通信使用 IPC，消息类型定义在 `src/common/IPCInfos.ts`
- 使用 `@electron/remote` 进行跨进程调用

## 象棋引擎协议

项目支持两种象棋引擎通信协议：

### UCCI (Universal Chinese Chess Interface)

- 中国象棋专用协议
- 参考文档: https://www.xqbase.com/protocol/cchess_ucci.htm
- 实现位于 `src/main/UCCI.ts`

### UCI (Universal Chess Interface)

- 通用国际象棋协议，部分引擎也支持
- 与 UCCI 类似但有细微差别

### 引擎通信关键命令

- `ucci`/`uci`: 初始化引擎
- `isready`: 检查引擎就绪状态
- `position`: 设置棋盘局面（使用 FEN 格式）
- `go`: 开始计算最佳着法
- `stop`: 停止计算
- `quit`: 退出引擎

## 棋谱格式

### FEN (Forsyth-Edwards Notation)

- 用于表示棋盘局面
- 实现位于 `src/common/Fen.ts`
- 初始局面: `rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w`

### ICCS (ICCS Chinese Chess Standard)

- 用于表示着法（如 "h2e2" 表示炮二平五）
- 实现位于 `src/common/ICCS.ts`

## 棋子表示

| 棋子 | 红方 | 黑方 | 英文代码 |
|------|------|------|----------|
| 将/帅 | 帥 | 將 | K/k |
| 士/仕 | 仕 | 士 | A/a |
| 象/相 | 相 | 象 | B/b |
| 马 | 馬 | 馬 | N/n |
| 车 | 車 | 車 | R/r |
| 炮 | 炮 | 砲 | C/c |
| 兵/卒 | 兵 | 卒 | P/p |

## 常用命令

```bash
# 安装依赖
npm install

# 开发模式运行
npm start

# 运行测试
npm test

# 打包应用
npm run package

# 生产构建
npm run make:prod

# 代码检查
npm run lint
```

## 测试

- 测试文件位于 `test/` 目录
- 使用 Jest 测试框架
- 运行 `npm test` 执行所有测试
- 运行 `npm run test-c` 查看测试覆盖率

## 注意事项

1. **平台限制**: 由于引擎限制，目前只支持 Windows 平台
2. **引擎文件**: 引擎可执行文件位于 `assets/engine/`，不要修改或删除
3. **进程通信**: 主进程和渲染进程通信必须通过 IPC
4. **Canvas 渲染**: 棋盘使用 Konva 库渲染，注意性能优化
5. **类型安全**: 尽量使用 TypeScript 类型，避免 `any`
6. **CI 验证**: 每次功能实现完成后，必须本地验证 `npm run package`（webpack 编译）和 `npm test`（单元测试）均通过，以确保 PR CI 检测不会失败

## 功能开发指南

### 添加新棋子走法规则

1. 在 `src/common/pieces/` 创建新类继承 `BaseChess`
2. 实现 `getValidMoves()` 方法
3. 在 `Pieces.ts` 中注册新棋子类型

### 添加新引擎

1. 将引擎可执行文件放入 `assets/engine/`
2. 在 `src/common/constants.ts` 添加引擎常量
3. 在 `src/main/UCCI.ts` 中添加引擎配置

### IPC 通信

1. 在 `src/common/IPCInfos.ts` 定义消息类型
2. 在 `src/main/ipc.ts` 添加主进程处理
3. 在渲染进程使用 `ipcRenderer` 发送/接收消息
