# ARDM - Another Redis Desktop Manager (Electrobun Port)

将 [AnotherRedisDesktopManager](https://github.com/qishibo/AnotherRedisDesktopManager) 从 Electron 重构到 [Electrobun](https://docs.electrobunny.ai/electrobun/) 框架。使用系统 WebView2 渲染 Vue 2 前端 UI，Bun 作为后端运行时。

## 与原版的差异

| 方面 | 原版 (Electron) | 本版 (Electrobun) |
|------|----------------|-------------------|
| 运行时 | Node.js + Electron | Bun + WebView2 |
| Chromium | 内置 ~150MB | 系统自带，不打包 |
| 主进程 | Electron main process | Bun 运行时 |
| IPC | ipcRenderer/ipcMain | postMessage RPC |
| 原生菜单 | Electron Menu API | Electrobun ApplicationMenu API |
| 自动更新 | electron-updater | Electrobun Updater API |
| 窗口管理 | BrowserWindow | Electrobun BrowserWindow |
| 打包体积 | ~100MB+ | ~15MB (不含 WebView2) |
| Redis 驱动 | ioredis (Node.js) | ioredis (Bun, 兼容) |

## 架构

```
WebView2 (系统 WebView)
  ┌─────────────────────────────────────────────┐
  │ Vue 2 + Element UI (@vue/compat)            │
  │ redisClient.js → Proxy → window.__bunRpc    │
  │ electron-stub.js (替换真实 electron 模块)     │
  └──────────┬──────────────────────────────────┘
             │ postMessage (Electrobun RPC)
  ┌──────────▼──────────────────────────────────┐
  │ Bun 主进程 (src/bun/index.ts)                │
  │                                              │
  │ RedisConnectionManager                       │
  │ ├─ standalone Redis (ioredis)                │
  │ ├─ Sentinel (sentinels + password)           │
  │ ├─ Cluster (nodes + natMap)                  │
  │ ├─ SSH Tunnel (tunnel-ssh)                   │
  │ └─ TLS (ca/key/cert)                        │
  │                                              │
  │ RPC Handlers: redis.connect/call/scan/...    │
  │               clipboard/file/zlib/window/... │
  │ Messages: redis.ready/error/theme.changed    │
  └──────────────────────────────────────────────┘
```

**设计要点**:
- WebView 无 Node.js 环境，所有 Node 调用经 RPC 到 Bun 主进程
- `redisClient.js` 使用 JS `Proxy` 对象拦截方法，转发为 RPC `redis.call`
- Webpack `target: 'web'`，`electron`/`cpu-features` 替换为 stub

## 快速开始

```bash
git clone https://github.com/svier0/ARDM.git
cd ARDM
bun install
bun run dev
```

> 前端构建需配合原始项目仓库（参见 `scripts/sync-frontend.ps1`），仅修改 Bun 代码时可直接 `bun run dev`。

## 构建状态

| 阶段 | 状态 |
|------|------|
| Vue 2 前端渲染 | ✅ |
| Redis 连接 (standalone/Sentinel/Cluster) | ✅ |
| SSH 隧道 | ✅ |
| TLS 连接 | ✅ |
| 原生菜单 (中文) | ✅ |
| 更新机制 | ✅ |
| 窗口状态持久化 | ✅ |
| 主题同步 | ✅ |
| CLI 参数 | ✅ |
| 触摸屏/快捷键 | ✅ |
| 打包分发 | ❌ |

## 已知限制

- **无原生文件对话框**: Electrobun 暂不支持，`dialog.showOpenDialog` 返回 `{ canceled: true }`
- **Monaco Editor zlib viewer**: 部分 Viewer 组件直接 `require('zlib')`，需 RPC 改造
- **无热更新**: 前端修改需完整 webpack 构建 + 同步（`sync-frontend.ps1`）
- **原生菜单中文乱码**: 依赖 `node_modules/electrobun` 补丁（`bun install` 后需重新应用）

## 目录结构

```
ARDM/
├── electrobun.config.ts       # view entrypoint + release 配置
├── package.json               # 依赖: electrobun / ioredis / tunnel-ssh / ssh2
├── tsconfig.json
├── .gitignore
├── scripts/
│   └── sync-frontend.ps1      # 一键构建 + 同步脚本 (gitignored)
├── src/
│   ├── bun/
│   │   └── index.ts           # Bun 主进程 (~960 行, 含 RPC handlers)
│   └── mainview/              # 前端资源 (由 sync-frontend.ps1 填充)
│       ├── index.html         # webpack 构建产物
│       ├── index.ts           # view 桥接脚本 (Electroview.defineRPC)
│       ├── editor.worker.js   # monaco editor worker
│       ├── json.worker.js     # monaco editor worker
│       └── static/            # webpack 产物 (js/css/fonts/img/theme)
└── build/                     # gitignored, Electrobun 构建产物
```
