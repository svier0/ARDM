# 🚨 新会话恢复须知

新会话首次读此文件后，请按以下步骤操作：

0. **🚨 首要规则**: 严格遵守 subagent 规则。**根会话只派任务和写本 GUIDE，绝不直接操作文件或运行命令。**
1. **状态确认**: 派 subagent 读取 `src/bun/index.ts`、`src/mainview/index.ts`、`src/mainview/index.html` 确认当前状态。根会话不直接 `read` 源文件。
2. **TODO 跟踪**: 开始工作前 `todowrite`，每步更新状态。
3. **前端构建**: 前端代码在 `frontend/` 目录中，webpack 4 构建：
    ```bash
    cd frontend
    bun build/build.js
    # 然后同步到 src/mainview/
    robocopy frontend/dist src/mainview /E /PURGE
    # 注意：index.html 末尾需有 <script src="views://mainview/index.js"></script>
    # 注意：恢复 index.ts —— git checkout HEAD -- src/mainview/index.ts
    ```
4. **测试**: 派 subagent 执行 `bun run dev` 验证（20秒后 kill 进程）。
5. **构建便携包**: 必须使用固定脚本，不要让subagent临时思考构建流程：
    ```bash
    cd D:\x\agents\opencode\ARDM
    bun run build:portable
    ```
    或指定版本号：
    ```bash
    bun run scripts/build-portable.ts --version "1.7.1.260621-alpha8"
    ```

## 当前状态：项目已可运行

RPC transport 已正常通信，项目端到端全功能可用。
