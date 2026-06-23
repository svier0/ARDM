# 构建与运行

## 开发运行

```bash
bun run dev
```

启动 Electrobun 开发模式，自动编译 Bun 主进程和 view 桥接脚本。

## 前端构建

前端代码在 `frontend/` 目录中，webpack 4 构建：

```bash
cd frontend
bun build/build.js
```

构建产物输出到 `frontend/dist/`。

然后同步到 `src/mainview/`：

```bash
robocopy frontend/dist src/mainview /E /PURGE
```

注意：每次构建后 `index.html` 末尾需要添加 bridge 脚本引用：
```html
<script src="views://mainview/index.js"></script>
```
（同步后执行 `git checkout HEAD -- src/mainview/index.ts` 恢复 index.ts，避免被覆盖）

## 便携包构建

一键构建（自动清理、构建、解压、重命名、嵌图标、打包、清理）：

```bash
bun run build:portable
```

指定版本号：

```bash
bun run scripts/build-portable.ts --version "1.7.1.260623-alpha8"
```

### 构建流程（9 步）

| Step | 操作 |
|------|------|
| 1 | 清理 `dist/`、`build/`、`artifacts/` |
| 2 | `bun x electrobun build --env=stable` |
| 3 | 解压 `ARDM-Setup.tar.zst` 到 `dist/` |
| 4 | `launcher.exe` → `ARDM.exe` |
| 5 | rcedit 嵌入图标 |
| 6 | 清理杂文件（Info.plist 等） |
| 7 | 验证文件结构 |
| 8 | 打包 7z |
| 9 | 清理 `build/` 和 `artifacts/` |

## 输出文件

- dev 输出: `dev_stdout.txt`、`dev_stderr.txt`
- 便携包: `dist\ARDM-*-Win64.7z`（~27MB）
