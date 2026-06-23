# 依赖管理

## 根项目依赖 (package.json)

| 依赖 | 用途 |
|------|------|
| electrobun | 桌面应用框架 |
| ioredis | Redis 客户端 |
| tunnel-ssh | SSH 隧道 |
| ssh2 | SSH 连接 |
| rcedit | Windows exe 图标嵌入 |

## 前端依赖 (frontend/package.json)

| 依赖 | 版本（锁定） | 用途 |
|------|-------------|------|
| vue@2 | 2.6.11 | 前端框架 |
| element-ui | 2.4.11 | UI 组件库 |
| monaco-editor | 0.30.1 | JSON 编辑器 |
| font-awesome | ^4.7.0 | 图标 |
| webpack | 4.47.0 | 构建工具 |
| vue-i18n | 8.7.0 | 国际化 |
| vxe-table | 3.9.0-rc.23 | 表格组件 |
| babel | 7.x | JS 转译 |
| vue-loader | ^15.9.8 | Vue SFC 编译 |

## 注意事项

- **无 Node.js**，仅使用 Bun (>1.18)
- 前端依赖使用 `bun install` 在 `frontend/` 目录下安装
- 前端构建使用 `bun build/build.js`（通过 bun 运行 webpack 4）
- 前端依赖版本已锁定为原项目版本，避免意外升级引入兼容问题
