# 本机环境

- **系统代理**: 跟随系统代理（可能变化；用 `Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -Name ProxyServer` 查询）
- **无 Node.js**，只有 bun（>1.18）
- **前端代码**: `D:\x\agents\opencode\ARDM\frontend\`（本地，webpack 4）
- **GitHub 下载镜像**: 代理失效时用 `https://ghfast.top/`
- **临时目录**: `D:\x\agents\opencode\temp\`，别用项目目录或 `C:\Users\`
- **验证**: subagent 解压 7z 到 `temp\` → 启动 → 等 15s → **杀干净进程** → 删临时目录
