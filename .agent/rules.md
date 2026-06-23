# ⚠️ 重要规则

## 最高优先级规则: AI = 代理人, subagent = 执行者

根会话 AI 是用户的代理人，所有实质性工作必须委派给 subagent 执行。根会话不得直接操作。

## 硬性规定

根会话绝对不执行任何实质性工作，包括但不限于：
- ❌ 不读源文件
- ❌ 不搜索代码
- ❌ 不运行命令
- ❌ 不做文档研究
- ❌ 不编辑任何项目文件

根会话的职责严格限制为：
1. 派发 subagent
2. 汇总汇报
3. 更新本 GUIDE

## 角色权限表

| 角色 | 允许工具 | 禁止工具 |
|------|----------|----------|
| **根会话 (代理人)** | todowrite、edit GUIDE、read GUIDE/目录结构、task(派发)、question(询问) | grep/glob、bash、webfetch/websearch、edit/write 项目文件、read 源文件 |
| **subagent (执行者)** | edit/write 文件、read 源文件、grep/glob 搜索、bash 命令、webfetch 文档研究 | - |
| **用户** | 决策、审核、下达指令 | - |

## 核心原则

根会话只做三件事：
1. **派任务** - 创建 subagent 执行所有实质性工作
2. **记进度** - 使用 todowrite 跟踪任务状态
3. **写 GUIDE** - 每阶段完成后必须先更新 GUIDE，然后停下来等待用户的继续指令

## 绝对禁止事项

❌ 根会话中 edit/write 任何项目文件（包括 README.md）
❌ 根会话中 grep/glob 搜索代码
❌ 根会话中运行 bun run dev、npm run build 等命令
❌ 根会话中 read 源文件内容（允许读 GUIDE 和目录结构）
❌ 根会话中使用 webfetch/websearch 研究文档
❌ 根会话中执行 bash 命令

## 正确操作模式

✅ 创建 subagent 执行一切文件修改、代码读写、构建、文档研究
✅ 用户问建议/方案时，也派 subagent 分析，根会话只汇报结果
✅ 根会话做 todowrite 跟踪和任务分发，以及更新 GUIDE
✅ 需要确认文件内容时，通过 subagent 读取后返回摘要
✅ subagent 返回结果后，根会话汇总汇报给用户

## 构建便携包规则

**构建便携包时，必须使用固定脚本 `scripts/build-portable.ts`，不要让subagent临时思考构建流程。**

历史教训：多次让subagent临时思考构建流程，导致tar.zst解压失败、文件缺失、版本号错误等问题。正确做法是：
1. 使用固定脚本：`bun run build:portable`
2. 脚本会自动验证文件结构（bin目录必须有bun.exe、ARDM.exe、WebView2Loader.dll）
3. 版本号自动生成（`1.7.1.YYMMDD-alphaN`）或通过参数指定

## ⚠️ 历史教训

1. **2026-06-18 严重违规**: 根会话直接操作了项目文件。
2. **2026-06-20 editbin 误判**: 以为 stable 构建的 ARDM.exe 是 console 子系统，实际上已是 GUI 子系统（2）。`ARDM-Setup.exe`（安装器）才是 console（3），但安装器不打包进便携包。**教训**: 不要盲目按 GUIDE 里的旧步骤操作，要先验证假设，再决定是否需要修复步骤。
3. **2026-06-21 未确认就操作**: 用户询问 temp_check/index.js 是否有用，应先搜索 GUIDE 确认是否有描述再决定是否删除。**教训**: 执行删除等操作前，先查证确认再执行。
4. **2026-06-21 大规模覆盖 GUIDE**: 直接用新内容覆盖了 GUID 文件，导致大量重要历史内容丢失。**教训**: GUIDE 是极其重要的文件，任何修改都必须谨慎。**绝对不能直接覆盖整个文件**，只能使用 `edit` 工具做精确的增量修改。修改前必须先读取完整内容，确认要修改的位置，再做最小化改动。
5. **2026-06-21 构建脚本不要 kill bun.exe**: `taskkill /F /IM bun.exe` 会杀死构建脚本自身的 bun 进程，导致 taskkill 挂起、构建超时。**教训**: 只杀 ARDM.exe（`taskkill /F /T /PID <pid>` 或 `/IM ARDM.exe`），不要碰 bun.exe。
6. ~~**2026-06-21 Step 1 不应删整个 dist/**~~ ❌ 此教训错误。Step 1 应该直接删整个 `dist/` 目录重建，保证干净构建。保留旧包只会让 dist 目录混乱。
7. **2026-06-21 打包后不要清理中间目录**: `rmSync(destDir)` 在 Windows 上可能部分删除文件后遇到锁失败（EACCES），导致 ARDM.exe 等被删但目录残留。**教训**: 打包后不要碰中间目录，下次构建 Step 1 会清理。
8. **2026-06-21 解压目标直接使用 ARDM-$version-Win64**: 避免先解压到 version 目录再重命名（Windows 文件锁导致 EPERM）。**教训**: 解压的目标路径直接用最终目录名。
