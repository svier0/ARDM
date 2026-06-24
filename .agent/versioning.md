# 版本号规范

## 版本号格式

`主版本.次版本.修订号.YYMMDD-alphaN`

- `YYMMDD` = 构建日期（如 `260621` = 2026-06-21）
- `alphaN` = 当天第 N 次构建

## 当前版本基线

| 版本 | Commit | 状态 | 说明 |
|------|--------|------|------|
| 1.7.1.260624-alpha1 | `f03e47b` | ✅ 可用 | 修复设置导入/导出：btoa/atob 替代 Buffer.from |
| 1.7.1.260623-alpha7 | `56aa691` | ✅ 可用 | 前端迁移本地 + 构建脚本 + 布局修复 + 指南更新 |
| 1.7.1.260621-alpha4 | `5b44dfd` | ✅ 可用 | Phase 1-7 完成 |
| 1.7.1.260621-alpha5+ | - | ❌ 已回退 | Phase 8 失败的前端迁移 |

## 版本号位置

- `electrobun.config.ts` → `app.version`
- 便携包文件名：`ARDM-{version}-Win64.7z`

## 注意事项

- 版本号由构建脚本自动生成（基于当天日期和构建计数器）
- 也可通过参数指定：`bun run build:portable --version "1.7.1.260621-alpha8"`
