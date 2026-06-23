# 历史记录

## 版本演进历史

### v1.7.1.260623-alpha7 (当前 HEAD, `8246a13`)
- ✅ 前端源码从原项目迁移到本地 `frontend/`，webpack 4 原样保留
- ✅ 清理 package.json 中的 Electron 依赖和脚本
- ✅ 重建 `scripts/build-portable.ts`：自动解压、launcher→ARDM 重命名、图标嵌入、清理
- ✅ 修复 `build-portable.ts` 的 Step 编号、destPath 到 dist/ 下、清理 build/artifacts
- ✅ 修复 `run()` 函数 stdin 阻塞导致 7z 卡死的问题
- ✅ 修复 `Bun.statSync` 不存在的 API 兼容问题（改用 fs.statSync）
- ✅ 锁定依赖版本（vue 2.6.11、element-ui 2.4.11、vue-i18n 8.7.0 等）
- ✅ App.vue mounted 中触发一次 resize 事件修复 KeyList 按钮位置异常
- ✅ RPC transport 通信正常，项目全功能可用

### v1.7.1.260621-alpha4 (`5b44dfd`)
- ✅ Phase 1-7 完成，所有已知功能修复
- ✅ 最后可用的版本

### v1.7.1.260621-alpha5 ~ alpha22 (已回退)
- ❌ Phase 8 前端迁移：Webpack 5、Monaco 多语言、source map 等
- ❌ `frontend/` 和 `scripts/` 目录已删除
- ❌ 引入大量问题，RPC transport 不通

### v1.7.1.260622-alpha1 (已回退)
- 修复前端 require/process/CSS 错误
- 增加 transport 就绪检测
- RPC 仍然不通

## 下一个会话恢复点

**当前完成**:
- 前端源码已迁移到本地 `frontend/`，webpack 4 原样不变 ✅
- 便携包构建脚本 `scripts/build-portable.ts` 已验证可工作 ✅
- 布局 resize 初始化已修复 ✅
- RPC transport 通信正常，项目端到端全功能可用 ✅
- 已提交并推送到 GitHub (`8174647`) ✅

## 注意事项
- **根会话只派 task + 写 GUIDE**，绝无例外
- **临时目录**: `D:\x\agents\opencode\temp\`，别用项目目录或 `C:\Users\`
- **系统代理**: 跟随系统代理（subagent 用 `Get-ItemProperty -Path 'HKCU:\...'` 查询）
- **验证**: subagent 解压 7z 到 `temp\` → 启动 → 等 15s → **杀干净进程** → 删临时目录
