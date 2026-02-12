# IPC 通道契约: 引擎配置

**日期**: 2026-02-12
**类型**: Electron IPC (Main ↔ Renderer)

> 当前迭代中, 引擎配置操作全部在主进程的原生菜单中完成,
> **不需要新增 IPC 通道**. 菜单点击事件直接在主进程中调用
> `EngineConfigService`.
>
> 以下为已有 IPC 通道的影响说明.

## 已有通道 - 无需变更

| 通道 | 方向 | 用途 | 影响 |
|------|------|------|------|
| `op:updateside` | Main → Renderer | 通知渲染进程更新对局方 | **引擎 key 从硬编码常量变为 EngineConfig.id**, 渲染进程无需知道差异(均为 string) |
| `render:querymove` | Renderer → Main (handle) | 请求引擎走棋 | 无变更, `feijiang.getEngineByTurnAsync()` 内部使用新的 ID 查找引擎 |
| `render:boardstatus` | Renderer → Main | 报告棋盘状态 | 无变更 |
| `render:bgm` | Renderer → Main | 音乐状态切换 | 无变更 |

## 未来扩展预留 (本迭代不实现)

若未来需要在渲染进程中展示引擎设置 UI (非原生菜单), 可新增:

| 通道 | 方向 | 用途 |
|------|------|------|
| `engine:list` | Renderer → Main (handle) | 获取引擎列表 |
| `engine:add` | Renderer → Main (handle) | 添加自定义引擎 |
| `engine:remove` | Renderer → Main (handle) | 移除自定义引擎 |
| `engine:update` | Main → Renderer | 引擎列表变更通知 |
