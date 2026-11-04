@echo off
chcp 65001 >nul
REM =============================================================================
REM  CharlieSSH 开发环境启动脚本 (Windows)
REM  使用方式: 双击 start-dev.bat 或在命令行运行
REM  编码: UTF-8 (无 BOM) + chcp 65001，保证中文与 emoji 正常显示
REM =============================================================================

setlocal

REM --- 切换到项目根目录 ---
REM 本脚本位于 <项目根>\docs\dev-ops\ 下，需向上两级才是项目根
cd /d "%~dp0..\.."
if not exist "package.json" (
    echo [错误] 未找到 package.json，请确认脚本位于项目的 docs\dev-ops 目录下
    pause
    exit /b 1
)

echo ========================================
echo   CharlieSSH 开发环境启动
echo   项目目录: %CD%
echo ========================================
echo.

REM --- 检查 Node.js ---
where node >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 22+
    echo        下载地址: https://nodejs.org/
    pause
    exit /b 1
)

set "NODE_MAJOR=0"
for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set "NODE_MAJOR=%%v"
if %NODE_MAJOR% lss 22 (
    echo [警告] 当前 Node.js 主版本为 %NODE_MAJOR%，建议升级到 22+
    echo.
)

REM --- 检查 npm ---
where npm >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 npm，请先安装 Node.js（自带 npm）
    pause
    exit /b 1
)

REM --- 检查 Rust ---
where rustc >nul 2>&1
if errorlevel 1 (
    echo [错误] 未找到 Rust，请先安装 Rust
    echo        Windows: https://rustup.rs
    echo        安装命令: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
    pause
    exit /b 1
)

REM --- 安装依赖（node_modules 缺失则整体安装）---
if not exist "node_modules" (
    echo [安装] 正在安装项目依赖...
    call npm install
    if errorlevel 1 (
        echo [错误] npm install 执行失败
        pause
        exit /b 1
    )
) else if not exist "node_modules\@tauri-apps\cli" (
    echo [安装] 未检测到 Tauri CLI，正在安装...
    call npm install -D @tauri-apps/cli
    if errorlevel 1 (
        echo [错误] Tauri CLI 安装失败
        pause
        exit /b 1
    )
)

REM --- 检查开发端口是否被占用 ---
REM 端口需与 vite.config.ts 的 server.port 保持一致
set "DEV_PORT=5173"
set "PORT_BUSY="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":%DEV_PORT% "') do set "PORT_BUSY=%%p"
if defined PORT_BUSY (
    echo [警告] 端口 %DEV_PORT% 已被占用 ^(PID: %PORT_BUSY%^)
    echo        可能是上次未正常退出的 vite 进程，可执行:
    echo        taskkill /PID %PORT_BUSY% /F
    echo.
)

echo.
echo [启动] 正在启动 CharlieSSH 开发服务器...
echo        按 Ctrl+C 停止
echo.
echo ========================================
echo.

REM --- 启动 Tauri 开发环境 ---
REM 必须用 call，否则 npm.cmd 不会把控制流交回本脚本
call npm run tauri dev

echo.
echo [结束] 开发服务器已停止
pause
endlocal
