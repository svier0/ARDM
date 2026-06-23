# 文件映射表

## 关键文件

| 文件 | 说明 |
|------|------|
| `src/bun/index.ts` | Bun 主进程，RPC handlers |
| `src/mainview/index.ts` | Electrobun 桥接脚本，定义 `window.__bunRpc` |
| `src/mainview/index.html` | 前端入口 HTML |
| `frontend/src/` | Vue 2 前端源码 |
| `frontend/build/` | webpack 4 构建配置 |
| `scripts/build-portable.ts` | 便携包构建脚本 |
| `electrobun.config.ts` | Electrobun 项目配置 |

## 构建流程

| 步骤 | 命令 |
|------|------|
| 安装前端依赖 | `cd frontend && bun install` |
| 构建前端 | `cd frontend && bun build/build.js` |
| 启动开发 | `bun run dev` |
| 构建便携包 | `bun run build:portable` |

## 开发建议

### 前端开发
1. 修改 `frontend/src/` 中的代码
2. 执行 `cd frontend && bun build/build.js` 构建
3. 将 `frontend/dist/` 内容复制到 `src/mainview/`（注意添加 bridge 脚本引用和恢复 index.ts）
4. 执行 `bun run dev` 测试

### 后端开发
1. 修改 `src/bun/index.ts`
2. 执行 `bun run dev` 测试

### 调试技巧
- 前端日志使用 `console.log`，在 WebView2 DevTools 中查看
- 后端日志使用 `console.log`，在 `dev_stdout.txt` 中查看
- 日志格式统一前缀 `[BunRPC]` 便于过滤
