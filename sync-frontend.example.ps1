param(
    [string]$SourceDir = (Join-Path $PSScriptRoot "..\AnotherRedisDesktopManager"),
    [string]$TargetDir = $PSScriptRoot
)

# Sync frontend build from original project to Electrobun project
#
# Usage:
#   .\sync-frontend.example.ps1
#   .\sync-frontend.example.ps1 -SourceDir "D:\path\to\original" -TargetDir "D:\path\to\ARDM"

$target = Join-Path $TargetDir "src\mainview"

Write-Host "Building frontend in original project..." -ForegroundColor Cyan
$env:NODE_OPTIONS = "--openssl-legacy-provider"
Push-Location $SourceDir
npm run build
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Pop-Location

Write-Host "Copying to ARDM project..." -ForegroundColor Cyan
Get-ChildItem -Path $target -Exclude "index.ts" | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item -Path "$SourceDir\dist\*" -Destination "$target\" -Recurse -Force

Write-Host "Injecting Electrobun view script..." -ForegroundColor Cyan
$html = Get-Content "$target\index.html" -Raw
if ($html -notmatch 'views://mainview/index.js') {
    $html = $html -replace '</body>', '<script src="views://mainview/index.js"></script></body>'
    $html | Set-Content "$target\index.html" -NoNewline
    Write-Host "View script injected." -ForegroundColor Green
} else {
    Write-Host "View script already present." -ForegroundColor Yellow
}

Write-Host "Sync complete!" -ForegroundColor Green
