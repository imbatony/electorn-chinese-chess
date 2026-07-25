# 发布流程

项目使用 `CHANGELOG.md` 作为 GitHub Release 说明的唯一来源。版本更新必须先通过
Release PR 合并到 `main`，再为该合并提交创建 tag。

## 日常维护

每个面向用户的变更都应加入 `CHANGELOG.md` 的“未发布”区，并放入合适分类：

- 主要更新
- 问题修复
- 安全与依赖
- 兼容性说明

条目使用中文 Markdown 列表，描述用户能够感知的变化。不要加入 `TBD`、`TODO`、
“待补充”等占位内容。

## 创建 Release PR

1. 从最新 `main` 创建发布分支。
2. 执行发布准备命令，其中版本号必须是高于当前版本的严格 SemVer：

   ```powershell
   npm run release:prepare -- 0.0.18
   ```

3. 审阅该命令对 `package.json`、`package-lock.json` 和 `CHANGELOG.md` 的修改。
4. 运行发布门禁：

   ```powershell
   npm run release:check
   npm run format:check
   npm run lint -- --max-warnings=0
   npm run typecheck
   npm run knip
   npm test -- --runInBand --detectOpenHandles
   npm audit --omit=dev --registry=https://registry.npmjs.org
   npm run package
   ```

5. 创建标题为 `release: prepare vX.Y.Z` 的 PR。PR 只应包含发布准备及必要的发布流程修复。

发布准备命令只修改文件，不会创建提交、tag、PR 或 GitHub Release。

## 发布

Release PR 合并后，在最新 `main` 上创建并推送 annotated tag：

```powershell
git switch main
git pull --ff-only origin main
git tag -a v0.0.18 -m "Release v0.0.18"
git push origin v0.0.18
```

tag workflow 会再次验证版本、CHANGELOG、主分支归属和完整工程门禁，然后创建 Release。
最终资产名称固定为：

- `windows-X.Y.Z.Setup.exe`
- `windows-win32-x64-X.Y.Z.zip`

workflow 还会复核 Release 标题、中文说明、资产名称和文件大小。任何不一致都会使发布失败。

## 修订发布说明

GitHub Release 只是 `CHANGELOG.md` 的发布快照。若已发布说明需要修订，应先通过 PR 修改
`CHANGELOG.md`，再将同样内容同步到 GitHub Release，避免两个来源长期不一致。
