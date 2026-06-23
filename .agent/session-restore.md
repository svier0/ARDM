# 🚨 新会话恢复须知

新会话首次读此文件后，请按以下步骤操作：

0. **🚨 首要规则**: 严格遵守 subagent 规则。**根会话只派任务和写本 GUIDE，绝不直接操作文件或运行命令。**
1. **状态确认**: 派 subagent 读取关键文件确认状态：
   - `src/bun/index.ts` — Bun 主进程入口
   - `src/mainview/index.ts` — view 桥接脚本
   - `.gitignore` — 确认 `src/mainview/**` + `!src/mainview/index.ts` 规则
   - `package.json` — 确认版本号
2. **TODO 跟踪**: `todowrite` 创建任务列表，每步更新状态。
3. **前端构建**（仅在修改前端代码后需要）:
   ```bash
   cd frontend
   bun build/build.js
   # 同步到 src/mainview/
   robocopy frontend/dist src/mainview /E /PURGE
   # 恢复被 /PURGE 误删的 index.ts
   git checkout HEAD -- src/mainview/index.ts
   ```
   > 注意：构建产物 `index.html` 末尾需手动添加 `<script src="views://mainview/index.js"></script>`
4. **测试**: 派 subagent 执行 `bun run dev` 验证（20秒后 kill 进程）。若网络差可能需要先配 git 代理（见 environment.md）。
5. **构建便携包**: 必须使用固定脚本，subagent 不得临时思考构建流程：
   ```bash
   cd D:\x\agents\opencode\ARDM
   bun run build:portable
   ```
   或指定版本号：
   ```bash
   bun run scripts/build-portable.ts --version "1.7.1.260623-alpha8"
   ```

## 当前状态：项目已可运行

RPC transport 正常通信，Redis 连接/SSH 隧道/Cluster 全功能可用，便携包构建通过。
无未修复的阻塞问题。详细进度 → [status.md](status.md)，版本基线 → [versioning.md](versioning.md)。
