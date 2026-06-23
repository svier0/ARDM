# 本机环境

- **系统代理**: `127.0.0.1:7897`（可能变化；`Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -Name ProxyServer` 查询）
- **git 代理**: 若 push 失败，执行 `git config --global http.proxy http://127.0.0.1:7897 && git config --global https.proxy http://127.0.0.1:7897`
- **无 Node.js**，只有 bun（>1.18）
- **前端代码**: `D:\x\agents\opencode\ARDM\frontend\`（本地，webpack 4）
- **GitHub 下载镜像**: 代理失效时用 `https://ghfast.top/`
- **临时目录**: `D:\x\agents\opencode\temp\`，别用项目目录或 `C:\Users\`
- **验证**: subagent 解压 7z 到 `temp\` → 启动 → 等 15s → **杀干净进程** → 删临时目录
