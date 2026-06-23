# 当前状态

| 阶段 | 状态 | 说明 |
|------|------|------|
| Phase 1: 项目骨架 | ✅ 完成 | 正常窗口 + 占位页面 |
| Phase 2: 前端构建集成 | ✅ 完成 | Vue 2 UI 在 WebView2 渲染 |
| Phase 3: RPC + Redis 连接 | ✅ 完成 | ioredis 已迁移到主进程，RPC 代理已实现 |
| Phase 4: 主进程功能移植 | ✅ 完成 | 窗口状态持久化、主题 IPC、CLI 参数、字体枚举、窗口控制、快捷键、设置页面对接 |
| Phase 5: Electrobun 特有功能 | ✅ 完成 | 原生菜单已删除（非原项目功能），保留 Updater API |
| Phase 6: 打包分发 | ✅ 完成 | Windows 便携包(7z, 27MB) + 窗口/任务栏图标 FFI 修复 |
| Phase 7: 功能修复 | ✅ 完成 | Redis 连接泄漏 + SCAN 修复 + Buffer 序列化 + Font Awesome + RPC thenable 修复 |
| Phase 8: 前端迁移 | ✅ 完成 | 前端源码从原项目迁移到本地 frontend/，webpack 4 原样保留 |
| 便携包构建脚本 | ✅ 完成 | `scripts/build-portable.ts`：launcher→ARDM 重命名、图标嵌入、自动清理 |
| 布局初始化修复 | ✅ 完成 | App.vue mounted 中触发 resize 事件解决 KeyList 按钮位置异常 |
| 整体运行状态 | ✅ 可用 | 项目端到端全功能可运行，RPC 通信正常 |

---

# 各阶段详细记录

## Phase 1: 项目骨架 (✅ 完成)
- Electrobun 配置初始化 (`electrobun.config.ts`)
- 基础窗口显示 (1200x800, centered)

## Phase 2: 前端构建集成 (✅ 完成)
- Webpack target 改为 `'web'`
- `NormalModuleReplacementPlugin` 替换 `electron` 和 `cpu-features`
- 内联 stub 脚本处理 theme/ipcRenderer
- `sync-frontend.ts` 实现一键构建同步

## Phase 3: RPC + Redis 连接 (✅ 完成)
- ioredis 迁移到 Bun 主进程，WebView 通过 RPC postMessage 调用
- `redisClient.js` 用 Proxy 对象拦截方法调用，转发为 RPC
- 支持 standalone/Sentinel/Cluster + SSH 隧道 + TLS

## Phase 4: 主进程功能移植 (✅ 完成)
- 窗口状态持久化（`WindowStateManager`，位置/尺寸/最大化自动保存恢复）
- 主题同步、字体枚举、CLI 参数、窗口控制、快捷键全部通过 RPC 接入

## Phase 5: Electrobun 特有功能 (✅ 完成)

**原生菜单**: 已删除。Electrobun 的 RPC transport 不支持菜单 IPC，且默认隐藏 + Alt 切换方案存在闪烁问题，最终放弃。

**更新机制（保留 ✅）**:
- 4 个 RPC handler: `updater.checkForUpdate` / `downloadUpdate` / `applyUpdate` / `getLocalInfo`
- 配置 `electrobun.config.ts` → `release.baseUrl` 指向 GitHub Releases

## Phase 6: 打包分发 (✅ 完成)

**目标**: 生成 Windows 便携版（无需安装，即解即用）

**方案选择**: 放弃 `--env=canary`（入口 exe 坏的 extractor stub）。改用 `--env=stable` 构建，产物为 `ARDM-Setup.tar.zst`（应用压缩包）+ `ARDM-Setup.exe`（安装器）。

**过程**:
1. `bun x electrobun build --env=stable` → 生成 `build\stable-win-x64\`
2. 解压 `ARDM-Setup.tar.zst`（7z 解压 zst → tar → 得到完整运行目录）
3. `rcedit` 手动嵌入图标（electrobun 的自动嵌入因路径硬编码 bug `D:\a\electrobun\...` 而失败）
4. post-build: `bin\launcher.exe` → `bin\ARDM.exe`
5. 删除 `Info.plist` 等杂文件
6. 打包 7z（取解压后目录内容，避免多余层级）

**产物**:
| 文件 | 大小 | 说明 |
|------|------|------|
| `dist\ARDM-1.7.1.260621-alpha4-Win64.7z` | ~27.3 MB | 便携版，解压后根目录直接有 `bin\`、`Resources\` 等 |

**打包要点**:
- 7z 根目录直接是 `bin\`、`Resources\`、`lib\`，不要多一层目录
- 删 `Info.plist`
- 必须手动 rcedit 嵌图标：`node_modules\rcedit\bin\rcedit-x64.exe .\bin\ARDM.exe --set-icon ..\..\resources\icons\icon.ico`

## Phase 7: 功能修复 (✅ 完成)

**修复内容**:

1. **Redis 连接泄漏** (`src/bun/index.ts`)
   - `retryStrategy`: 失败即放弃，不重试
   - `error` 事件: 检测 `client.status === "end"` → 自动调 `disconnect()`
   - 新增 `close` 事件处理器 → 兜底清理
   - `disconnect()`: `Promise.race` 5s 超时 + `catch` 回退

2. **RPC "ERR unknown command 'then'"** (`src/bun/index.ts`、`redisClient.js`)
   - Proxy get 拦截器中添加 `if (prop === 'then') return undefined`

3. **Font Awesome 字体加载失败** (`src/mainview/static/css/font-awesome.min.css`)
   - `@font-face` URL 替换为实际哈希文件名

4. **Buffer 序列化 [object Object] 键名** (`src/bun/index.ts`)
   - 新增 `reviveBuffers()` 函数，反序列化 `{type:"Buffer",data:[...]}` 为真实 Buffer

5. **SCAN cursor 类型** (`src/bun/index.ts`)
   - `scanBuffer()` 返回的 cursor 调用 `.toString()` 转为字符串

6. **SCAN 转圈** (`KeyList.vue`、`DeleteBatch.vue`、`MemoryAnalysis.vue`、`SlowLog.vue`、`Status.vue`、`redisClient.js`)
   - `this.client.nodes('master')` → `[this.client]`
   - 修复 `stream.push() after EOF` 错误
   - 新增 `endsWith('BufferStream')` 拦截

## Phase 8: 前端迁移 (✅ 完成)

**2026-06-23 重新迁移**:
- 前端源码从原项目完整拷贝到本地 `frontend/` 目录
- webpack 4 配置原样保留，不升级、不扩展
- 清理 package.json 中的 Electron 依赖和脚本
- 依赖版本锁定为原项目版本（vue 2.6.11、element-ui 2.4.11 等）
- 构建产物同步到 `src/mainview/`，保持与 alpha4 一致的结构
- 添加 `App.vue` mounted 中触发 resize 事件修复布局初始化问题

**便携包构建脚本**:
- 重建 `scripts/build-portable.ts`，9 步自动化流程
- Step 4: `launcher.exe` → `ARDM.exe` 重命名
- Step 5: rcedit 嵌入图标（ARDM.exe + bun.exe）
- Step 8: 7z 打包到 `dist/`（~27MB）
- Step 9: 自动清理 `build/` 和 `artifacts/`
- 支持自动版本号生成和参数指定

**已清理的垃圾**:
- ~~Webpack 5 配置~~（回到 webpack 4）
- ~~Monaco Editor 多语言扩展~~（回到仅 JSON）
- ~~Source map 产物~~（config 已设为 false）
- ~~ts.worker.js 7MB~~（不复存在）
