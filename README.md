# ARDM - Another Redis Desktop Manager (Electrobun Port)

**版本: 1.7.1.260623-alpha7**

将 [AnotherRedisDesktopManager](https://github.com/qishibo/AnotherRedisDesktopManager) 从 Electron 重构到 [Electrobun](https://docs.electrobunny.ai/electrobun/) 框架。使用系统 WebView2 渲染 Vue 2 前端 UI，Bun 作为后端运行时。

## 与原版的差异

| 方面 | 原版 (Electron) | 本版 (Electrobun) |
|------|----------------|-------------------|
| 运行时 | Node.js + Electron | Bun + WebView2 |
| Chromium | 内置 ~150MB | 系统自带，不打包 |
| 主进程 | Electron main process | Bun 运行时 |
| IPC | ipcRenderer/ipcMain | postMessage RPC |
| 原生菜单 | Electron Menu API | 已删除（非原项目功能） |
| 自动更新 | electron-updater | Electrobun Updater API |
| 窗口管理 | BrowserWindow | Electrobun BrowserWindow |
| 打包体积 | ~100MB+ | ~27MB (7z 便携包) |
| Redis 驱动 | ioredis (Node.js) | ioredis (Bun, 兼容) |

## 架构

```
WebView2 (系统 WebView)
  ┌─────────────────────────────────────────────┐
  │ Vue 2 + Element UI                          │
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

> 前端源码已迁移到本地 `frontend/` 目录，webpack 4 原样保留。首次或修改前端后需构建：`cd frontend && bun build/build.js && robocopy frontend/dist src/mainview /E /PURGE`。

## 构建便携包

```bash
bun run build:portable
```

自动完成：清理 → electrobun 构建 → 解压 → 重命名 launcher → 嵌入图标 → 清理 → 打包 7z。产物在 `dist/` 目录。

## 构建状态

| 阶段 | 状态 |
|------|------|
| Vue 2 前端渲染 | ✅ |
| Redis 连接 (standalone/Sentinel/Cluster) | ✅ |
| SSH 隧道 | ✅ |
| TLS 连接 | ✅ |
| 更新机制 | ✅ |
| 窗口状态持久化 | ✅ |
| 主题同步 | ✅ |
| CLI 参数 | ✅ |
| 触摸屏/快捷键 | ✅ |
| 应用图标 | ✅ |
| 打包分发 (7z 便携包) | ✅ |
| 前端源码本地化 | ✅ |

## 已知限制

- **无原生文件对话框**: Electrobun 暂不支持，`dialog.showOpenDialog` 返回 `{ canceled: true }`
- **无热更新**: 前端修改需完整 webpack 构建 + 同步
- **cpu-features 原生模块**: Bun 无法加载 `.node` 模块，已通过 stub 处理

## 目录结构

```
ARDM/
├── electrobun.config.ts           # view entrypoint + release 配置
├── package.json                   # 依赖: electrobun / ioredis / tunnel-ssh / ssh2
├── .gitignore
├── frontend/                      # 前端源码 (Vue 2 + webpack 4 本地构建)
│   ├── src/                       # Vue 组件/页面
│   ├── static/                    # 静态资源
│   ├── build/                     # webpack 4 构建配置
│   └── config/                    # 构建环境配置
├── scripts/
│   └── build-portable.ts          # 便携包构建脚本
├── src/
│   ├── bun/
│   │   └── index.ts               # Bun 主进程 (~960 行, 含 RPC handlers)
│   └── mainview/                  # 前端构建产物 (由 frontend/dist 同步)
│       ├── index.html             # webpack 构建产物
│       ├── index.ts               # view 桥接脚本 (Electroview.defineRPC)
│       └── static/                # webpack 产物 (js/css/fonts/img/theme)
└── build/                         # gitignored, Electrobun 构建产物
```
