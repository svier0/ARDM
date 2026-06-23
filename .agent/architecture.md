# 架构

## 架构图

```
WebView2 (系统 WebView)
  ┌─────────────────────────────────────────────┐
  │ Vue 2 + Element UI                          │
  │ redisClient.js → Proxy → window.__bunRpc    │
  │ electron-stub.js (替换真实 electron 模块)     │
  └──────────┬──────────────────────────────────┘
             │ postMessage (Electrobun RPC)
  ┌──────────▼──────────────────────────────────┐
  │ Bun 主进程 (src/bun/index.ts)               │
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

## 设计要点

- WebView 无 Node.js 环境，所有 Node 调用经 RPC 到 Bun 主进程
- `redisClient.js` 使用 JS `Proxy` 对象拦截方法，转发为 RPC `redis.call`
- Webpack `target: 'web'`，`electron`/`cpu-features` 替换为 stub
- **前端构建在本地 `frontend/` 目录进行**，webpack 4 原样保留，产物复制到 `src/mainview/`

## 目录结构

```
ARDM/
├── electrobun.config.ts           # view entrypoint + release 配置
├── package.json                   # 依赖: electrobun / ioredis / tunnel-ssh / ssh2
├── tsconfig.json
├── .gitignore
├── .agent/                        # 开发指南
├── frontend/                      # 前端源码 (Vue 2 + webpack 4)
│   ├── src/                       # Vue 组件/页面
│   ├── static/                    # 静态资源
│   ├── build/                     # webpack 4 构建配置
│   └── config/                    # 构建环境配置
├── scripts/
│   └── build-portable.ts          # 便携包构建脚本
├── src/
│   ├── bun/
│   │   └── index.ts               # Bun 主进程 (~960 行, 含 RPC handlers)
│   └── mainview/                  # 前端构建产物
│       ├── index.html             # webpack 构建产物
│       ├── index.ts               # view 桥接脚本 (Electroview.defineRPC)
│       └── static/                # webpack 产物 (js/css/fonts/theme)
└── build/                         # gitignored, Electrobun 构建产物
```
