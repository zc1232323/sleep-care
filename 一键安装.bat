@echo off
chcp 65001 >nul
title SleepCare 一键安装依赖

echo.
echo    ╔══════════════════════════════════╗
echo    ║   SleepCare 依赖安装程序       ║
echo    ║   正在安装，请稍候...          ║
echo    ╚══════════════════════════════════╝
echo.

cd /d "%~dp0backend"

echo [1/2] 检查 Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [错误] 没有找到 Node.js！请先安装 Node.js
    echo 下载地址：https://nodejs.org
    pause
    exit /b 1
)
echo [√] Node.js 已就绪

echo.
echo [2/2] 安装后端依赖（可能需要 1-2 分钟）...
call npm install

if errorlevel 1 (
    echo.
    echo [失败] 安装出错，请检查网络连接
    pause
    exit /b 1
)

echo.
echo    ╔══════════════════════════════════╗
echo    ║   安装完成！                    ║
echo    ║   接下来请双击「启动后端.bat」  ║
echo    ╚══════════════════════════════════╝
echo.
pause
