@echo off
chcp 65001 >nul
title SleepCare 后端服务

echo.
echo    ╔══════════════════════════════════╗
echo    ║   SleepCare 后端服务           ║
echo    ║   正在启动...                  ║
echo    ╚══════════════════════════════════╝
echo.

cd /d "%~dp0backend"

echo 启动地址：http://localhost:3000
echo.
echo 看到「服务已启动」后即可打开微信开发者工具
echo 关闭本窗口 = 停止服务
echo ────────────────────────────────────
echo.

node app.js

pause
