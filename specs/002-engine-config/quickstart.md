# 快速开始: 引擎配置规范化与自定义引擎支持

**日期**: 2026-02-12

## 前置条件

- Node.js 22+
- 已安装项目依赖: `npm install`
- Windows 操作系统 (引擎为 Win32 可执行文件)

## 验证步骤

### 1. 启动应用

```bash
npm start
```

### 2. 验证 Cyclone 引擎已移除

- 点击菜单: **游戏设置 → 红方**
- 确认列表中**不包含**"象棋旋风"
- 确认列表包含: 象棋爱好者、象眼、佳佳、南奥

### 3. 验证引擎配置文件自动生成

- 打开文件资源管理器, 导航至:
  `%APPDATA%/飞将象棋/`
- 确认存在 `engines.json` 文件
- 用文本编辑器打开, 确认包含 3 个内置引擎配置

### 4. 加载自定义引擎

1. 下载一个 UCI 引擎 (例如 [皮卡鱼 Pikafish](https://github.com/official-pikafish/Pikafish/releases)):
   - 下载对应平台的可执行文件
   - 解压到本地目录 (如 `D:\engines\pikafish\`)
2. 点击菜单: **引擎设置 → 加载引擎**
3. 在文件对话框中选择 `pikafish.exe`
4. 等待协议检测完成 (应显示"引擎加载成功: Pikafish ...")
5. 点击菜单: **游戏设置 → 黑方**
6. 确认新引擎已出现在列表中
7. 选择新引擎, 点击 **操作 → 重新开始**
8. 走一步棋, 验证引擎能正确应子

### 5. 验证持久化

1. 关闭应用
2. 重新启动: `npm start`
3. 点击菜单: **游戏设置 → 黑方**
4. 确认自定义引擎仍在列表中

### 6. 移除自定义引擎

1. 点击菜单: **引擎设置 → 管理引擎**
2. 点击目标引擎旁的移除选项
3. 确认菜单中该引擎已消失

### 7. 验证引擎路径失效处理

1. 手动删除或移动之前加载的引擎 EXE 文件
2. 重新启动应用
3. 点击菜单: **游戏设置 → 红方**
4. 确认该引擎显示为灰色 "(不可用)" 状态

## 运行测试

```bash
# 全部测试
npm test

# 覆盖率
npm run test-c

# 代码质量检查
npm run format:check
npm run lint
npm run knip

# 验证 parseInfoLine 解析正确性
npm test -- --testPathPattern=UCCI.test --verbose
```

## 验证 info 解析修复

在单元测试 (`test/UCCI.test.ts`) 中验证以下场景:

1. **depth 正确解析**: `info depth 15 ...` → `Info.depth === 15` (非 score)
2. **score cp 正确解析**: `info ... score cp 35 ...` → `Info.score === 35, Info.scoreType === 'cp'`
3. **score mate 正确解析**: `info ... score mate 5 ...` → `Info.score === 5, Info.scoreType === 'mate'`
4. **pv 变长解析**: `info ... pv e2e4 d7d5 e4d5` → `Info.pv === ['e2e4', 'd7d5', 'e4d5']`
5. **pvList 完整**: `infoAndMove()` 返回的 `pvList.length >= 1`

## 常见问题

**Q: 加载引擎时显示"无法识别引擎协议"**
A: 确认选择的文件是合法的 UCCI/UCI 象棋引擎可执行文件,
而非安装程序或其他程序.

**Q: 引擎加载后对局时无响应**
A: 部分引擎需要 NNUE 评估文件 (如 `pikafish.nnue`) 放在
与引擎 EXE 同一目录下. 请查阅引擎的使用说明.

**Q: 配置文件损坏怎么办?**
A: 删除 `%APPDATA%/飞将象棋/engines.json`, 重启应用,
将自动重新生成默认配置. 自定义引擎需要重新加载.
