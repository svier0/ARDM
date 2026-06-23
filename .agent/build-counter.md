# 构建计数器

## 用途

跟踪当天构建次数，自动生成版本号中的 `alpha-N` 后缀。

## 存储位置

`build-counter.json`（项目根目录，gitignored）

## 格式

```json
{
  "date": "2026-06-21",
  "count": 4
}
```

- `date`: 构建日期（YYYY-MM-DD）
- `count`: 当天已构建次数

## 行为

- 每天第一次构建：`count = 1`，生成 `alpha1`
- 当天后续构建：`count++`，生成 `alpha2`、`alpha3`...
- 跨天后自动重置

## 脚本引用

`scripts/build-portable.ts` 中读取并递增该计数器。
