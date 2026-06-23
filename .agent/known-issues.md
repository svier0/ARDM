# 已知问题

## 未修复

当前无未修复的阻塞问题。以下为已知限制（不影响核心功能）：
1. **无热更新**: 前端修改需要完整 webpack 构建 + 复制。
2. **无原生文件对话框**: `dialog.showOpenDialog` 返回 `{ canceled: true }`，需等待 Electrobun 原生对话框 API。
3. **cpu-features 原生模块**: Bun 无法加载 `.node` 原生模块，已通过文件替换 stub 处理。

## 已修复（当前会话）

18. ✅ **布局初始化问题**: 窗口打开后 KeyList 按钮在屏幕外，调整窗口大小后恢复。在 `App.vue` mounted 中触发一次 `window.dispatchEvent(new Event('resize'))` 解决。

## 已修复（Phase 7）

7. ✅ **zlib viewer 组件**: `zlib.decompress` RPC handler 已注册。
8. ✅ **Electron stub 限制**: addon.js 中 CLI 参数已接入 RPC。
9. ✅ **快捷键**: shortcut.js 窗口控制通过 RPC 实现。
10. ✅ **原生菜单中文乱码**: 菜单已删除。
11. ✅ **Font Awesome 图标缺失**: 在 `static/css/` 新增 `font-awesome.min.css`。
12. ✅ **Redis 连接泄漏**: 优化 retryStrategy、error/close 事件处理。
13. ✅ **RPC "ERR unknown command 'then'"**: Proxy get 拦截器中过滤 then 属性。
14. ✅ **Font Awesome 字体加载失败**: 修正 @font-face URL。
15. ✅ **Buffer 序列化键名问题**: 新增 reviveBuffers() 函数。
16. ✅ **SCAN cursor 类型错误**: scanBuffer 返回的 cursor 转为字符串。
17. ✅ **SCAN 转圈问题**: 修复 nodes 异步、stream EOF 错误、BufferStream 拦截。
