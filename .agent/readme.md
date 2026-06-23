# ARDM 开发指南

**版本: 1.7.1.260623-alpha7** | **项目: ARDM (Another Redis Desktop Manager - Electrobun Port)**

本文件是 `.agent/` 目录的入口。新会话只需读此文件，即可了解项目全貌及如何恢复上下文。更详细的内容按主题拆分在对应文件中。

---

## 📖 阅读路径

首次接入的新会话，请**按此顺序阅读**：

| 顺序 | 文件 | 为什么读 |
|------|------|----------|
| 1 | [rules.md](rules.md) | ⚠️ **最高优先级**：根会话/subagent 角色分工、硬性规定、核心原则、历史教训。**不读此文件就操作 = 违规** |
| 2 | [session-restore.md](session-restore.md) | 🚨 **新会话恢复步骤**：状态确认、TODO跟踪、构建/测试流程 |
| 3 | [environment.md](environment.md) | 本机环境（系统代理、Bun 版本、前端路径、GitHub 镜像） |
| 4 | [architecture.md](architecture.md) | 架构设计：WebView2 + Bun 主进程 RPC 通信、目录结构 |
| 5 | [status.md](status.md) | 当前完成进度 (Phase 1-8)、各阶段详细记录。要知道项目做到哪了就看这 |
| 6 | [versioning.md](versioning.md) | 版本号规范、版本基线表 |
| 7 | [build-counter.md](build-counter.md) | 构建计数器：跟踪当天构建次数，自动生成版本号 alpha-N |
| 8 | [build.md](build.md) | 构建与运行命令：前端构建、开发测试、便携包打包 |
| 9 | [frontend.md](frontend.md) | 前端迁移说明（webpack 4 本地构建，不再依赖原项目） |
| 10 | [dependencies.md](dependencies.md) | 依赖管理（根项目 + 前端依赖） |
| 11 | [known-issues.md](known-issues.md) | 已修复/未修复问题清单 |
| 12 | [history.md](history.md) | 会话历史、版本演进、下一个恢复点 |
| 13 | [original-files.md](original-files.md) | 文件映射表、开发建议 |

---

## 🚨 核心原则（必读摘要）

> **根会话 = 代理人，subagent = 执行者**
> - 根会话**绝不**读源文件、搜代码、跑命令、改文件、webfetch 研究
> - 根会话仅做三件事：**派 subagent、记进度 (todowrite)、写本指南**
> - 所有实质性工作（读/写文件、搜索、构建、文档研究）**必须**派 subagent 执行
> - **修改指南必须用 `edit` 增量修改，绝对禁止整文件覆盖**
> - **构建便携包必须用固定脚本** `scripts/build-portable.ts`（`bun run build:portable`），subagent 不得临时思考构建流程

**完整规则、角色权限表、历史教训 →** [rules.md](rules.md)

---

## 🚀 新会话快速启动

```yaml
会话启动时要做的事:
  1. 读 rules.md 和 session-restore.md  # 确保不违规
  2. 派 subagent 读取关键文件确认状态:
     - src/bun/index.ts
     - src/mainview/index.ts
     - src/mainview/index.html
  3. todowrite 创建任务列表
```

---

## 🏗️ 项目概览

ARDM 是将 Another Redis Desktop Manager 的 Vue 2 前端移植到 **Electrobun**（基于 Bun 的桌面应用框架）的项目。

```
WebView2 ──postMessage RPC── Bun 主进程
  Vue 2 + Element UI            ioredis (Redis 客户端)
  redisClient.js (Proxy)        SSH 隧道 / TLS / Cluster
  electron-stub.js              窗口控制 / 文件 / zlib / 更新
```

- **前端**: Vue 2 + Element UI，Webpack 4 构建
- **后端**: Bun 主进程处理 Redis、文件、窗口等操作
- **通信**: Electrobun RPC (postMessage)
- **打包**: Windows 便携包 (7z)，`build-portable.ts` 自动化

---

## ✅ 当前状态

| 阶段 | 状态 | 说明 |
|------|------|------|
| Phase 1-7 | ✅ 完成 | 项目骨架→前端集成→RPC→功能移植→打包→修复 |
| Phase 8: 前端迁移 | ✅ 完成 | 前端源码迁移到本地 frontend/，webpack 4 原样保留 |
| 便携包构建脚本 | ✅ 完成 | `scripts/build-portable.ts` 自动化 9 步流程 |
| 布局初始化修复 | ✅ 完成 | mounted 中触发 resize 事件 |
| 整体运行状态 | ✅ 可用 | 项目端到端全功能可运行，RPC 通信正常 |

完整记录 → [status.md](status.md)

---

## 📌 版本基线

| 版本 | Commit | 状态 | 说明 |
|------|--------|------|------|
| 1.7.1.260623-alpha7 | `56aa691` | ✅ 可用 | 前端迁移本地 + 构建脚本 + 布局修复 + 指南更新 |
| 1.7.1.260621-alpha4 | `5b44dfd` | ✅ 可用 | Phase 1-7 完成 |

---

## 📁 目录结构速览

```
ARDM/
├── .agent/                     # ← 本目录，开发指南（git 隐藏）
├── frontend/                   # 前端源码 (Vue 2 + Webpack 4)
│   ├── src/                    # Vue 组件/页面
│   ├── static/                 # 静态资源
│   ├── build/                  # webpack 4 配置
│   └── config/                 # 构建环境配置
├── package.json                # 依赖配置
├── scripts/
│   └── build-portable.ts       # 便携包构建脚本
├── src/
│   ├── bun/index.ts            # Bun 主进程 (~960行)
│   └── mainview/               # 前端构建产物 + index.ts bridge
│       ├── index.html          # webpack 构建产物
│       ├── index.ts            # view 桥接脚本 (Electroview.defineRPC)
│       └── static/             # webpack 产物 (js/css/fonts/theme)
└── electrobun.config.ts
```

---

## 本机环境

- **无 Node.js**，仅 bun (>1.18)
- 系统代理: `127.0.0.1:7897`（可能变化；`Get-ItemProperty -Path 'HKCU:\...\Internet Settings' -Name ProxyServer` 查询）
- GitHub 镜像: `https://ghfast.top/`
- git 代理: 若 push 失败，执行 `git config --global http.proxy http://127.0.0.1:7897 && git config --global https.proxy http://127.0.0.1:7897`
- 临时目录: `D:\x\agents\opencode\temp\`（别用项目目录或 C:\Users）

---

## 已知问题

当前无未修复的阻塞问题。完整清单 → [known-issues.md](known-issues.md)

---

**所有文件均在 `.agent/` 目录下，通过文件名即可定位对应内容。**
