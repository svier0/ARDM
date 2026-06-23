# 前端构建说明

## 当前状态

前端源码已迁移到本地 `frontend/` 目录，webpack 4 构建配置原样保留。

## 目录结构

```
frontend/
├── src/                    # Vue 2 源码
│   ├── components/         # Vue 组件
│   ├── viewer/             # 值查看器组件
│   ├── i18n/               # 国际化
│   ├── router/             # 路由
│   ├── App.vue             # 根组件
│   ├── main.js             # 入口（挂载 Vue）
│   ├── redisClient.js      # RPC 客户端代理
│   ├── electron-stub.js    # Electron API 桩
│   └── ...
├── static/                 # 静态资源（主题、字体）
├── build/                  # webpack 4 配置
│   ├── webpack.base.conf.js
│   ├── webpack.dev.conf.js
│   ├── webpack.prod.conf.js
│   ├── build.js
│   └── ...
├── config/                 # 构建环境配置
│   ├── index.js
│   ├── dev.env.js
│   └── prod.env.js
├── index.html              # 入口 HTML
├── package.json            # 依赖配置（已清理 Electron 相关）
├── babel.config.json
└── .postcssrc.js
```

## 构建命令

```bash
cd frontend
bun install              # 安装依赖（首次）
bun build/build.js       # webpack 4 构建
```

## 注意事项

- **前端代码本身与 alpha4 一致**，没有额外修改（除了 App.vue 的 resize 修复）
- webpack 4 配置保持原样，没有升级到 5
- monaco-editor 仅支持 JSON 语言（`languages: ['json']`）
- 生产构建 `productionSourceMap: false`（无 source map）
- `process` 等 Node 模块由 webpack 4 自动 polyfill
