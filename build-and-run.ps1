# GitNexus 一键拉取、构建、运行脚本
# 在 Windows PowerShell 中执行: powershell -ExecutionPolicy Bypass -File build-and-run.ps1

$ErrorActionPreference = "Stop"
$REPO_URL = "https://github.com/zhouqinglong520/GitNexus.git"
$PROJECT_DIR = "$PSScriptRoot\GitNexus"

Write-Host "`n========== GitNexus 自动构建工具 ==========" -ForegroundColor Cyan

# 1. 检查环境
Write-Host "`n[1/6] 检查环境..." -ForegroundColor Yellow

$missing = @()

if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    $missing += "Node.js (https://nodejs.org)"
}
if (!(Get-Command cargo -ErrorAction SilentlyContinue)) {
    $missing += "Rust (https://rustup.rs)"
}

if ($missing.Count -gt 0) {
    Write-Host "`n缺少以下工具，请先安装:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    Write-Host "`n还需要 Visual Studio C++ Build Tools:" -ForegroundColor Red
    Write-Host "  https://visualstudio.microsoft.com/visual-cpp-build-tools/" -ForegroundColor Red
    Write-Host "  安装时勾选 'C++ 桌面开发'" -ForegroundColor Red
    exit 1
}

Write-Host "  Node.js: $(node --version)" -ForegroundColor Green
Write-Host "  Rust: $(rustc --version)" -ForegroundColor Green
Write-Host "  npm: $(npm --version)" -ForegroundColor Green

# 2. 拉取/更新代码
Write-Host "`n[2/6] 拉取代码..." -ForegroundColor Yellow

if (Test-Path $PROJECT_DIR) {
    Write-Host "  已存在目录，拉取最新代码..."
    Set-Location $PROJECT_DIR
    git pull origin main 2>&1 | Out-Host
} else {
    Write-Host "  克隆仓库到 $PROJECT_DIR ..."
    git clone $REPO_URL $PROJECT_DIR 2>&1 | Out-Host
    Set-Location $PROJECT_DIR
}

# 3. 安装前端依赖
Write-Host "`n[3/6] 安装前端依赖..." -ForegroundColor Yellow
npm install 2>&1 | Select-String -NotMatch "npm warn" | Out-Host
Write-Host "  依赖安装完成" -ForegroundColor Green

# 4. 询问操作
Write-Host "`n[4/6] 选择操作:" -ForegroundColor Yellow
Write-Host "  1. 开发模式运行 (热重载，适合调试)" -ForegroundColor White
Write-Host "  2. 打包成 exe 安装包" -ForegroundColor White
Write-Host "  3. 打包并上传到 GitHub Release" -ForegroundColor White
$choice = Read-Host "`n请输入选项 (1/2/3)"

switch ($choice) {
    "1" {
        # 5a. 开发模式
        Write-Host "`n[5/6] 启动开发模式..." -ForegroundColor Yellow
        Write-Host "  应用窗口将自动弹出，关闭窗口或按 Ctrl+C 退出" -ForegroundColor Gray
        npm run tauri dev 2>&1 | Out-Host
    }
    "2" {
        # 5b. 打包
        Write-Host "`n[5/6] 打包 exe (首次约需 10-15 分钟)..." -ForegroundColor Yellow
        npm run tauri build 2>&1 | Out-Host

        $exePath = "$PROJECT_DIR\src-tauri\target\release\bundle\nsis\GitNexus_0.1.0_x64-setup.exe"
        $portablePath = "$PROJECT_DIR\src-tauri\target\release\GitNexus.exe"

        Write-Host "`n[6/6] 打包完成!" -ForegroundColor Green
        if (Test-Path $exePath) {
            Write-Host "  安装包: $exePath" -ForegroundColor Green
        }
        if (Test-Path $portablePath) {
            Write-Host "  便携版: $portablePath" -ForegroundColor Green
        }

        # 打开输出目录
        $bundleDir = "$PROJECT_DIR\src-tauri\target\release\bundle\nsis"
        if (Test-Path $bundleDir) {
            explorer.exe $bundleDir
        } else {
            explorer.exe "$PROJECT_DIR\src-tauri\target\release"
        }
    }
    "3" {
        # 5c. 打包并上传
        Write-Host "`n[5/6] 打包 exe..." -ForegroundColor Yellow
        npm run tauri build 2>&1 | Out-Host

        $exePath = "$PROJECT_DIR\src-tauri\target\release\bundle\nsis\GitNexus_0.1.0_x64-setup.exe"

        if (!(Test-Path $exePath)) {
            Write-Host "  打包失败，未找到 exe 文件" -ForegroundColor Red
            exit 1
        }

        Write-Host "`n[6/6] 上传到 GitHub Release..." -ForegroundColor Yellow

        # 检查 gh CLI
        if (!(Get-Command gh -ErrorAction SilentlyContinue)) {
            Write-Host "  正在安装 GitHub CLI..." -ForegroundColor Gray
            winget install GitHub.cli --accept-package-agreements --accept-source-agreements 2>&1 | Out-Host
            $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        }

        $tag = Read-Host "  输入版本号 (如 v0.5.0)"
        $title = Read-Host "  输入 Release 标题 (如 GitNexus v0.5.0)"

        gh release create $tag $exePath --title $title --notes "GitNexus $tag - 功能完整版本" 2>&1 | Out-Host

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  上传成功!" -ForegroundColor Green
            Write-Host "  https://github.com/zhouqinglong520/GitNexus/releases/tag/$tag" -ForegroundColor Cyan
        } else {
            Write-Host "  上传失败，请检查 gh auth login 是否已登录" -ForegroundColor Red
            Write-Host "  你也可以手动上传: https://github.com/zhouqinglong520/GitNexus/releases/new" -ForegroundColor Gray
            explorer.exe /select,$exePath
        }
    }
    default {
        Write-Host "  无效选项，退出" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n========== 完成 ==========" -ForegroundColor Cyan
