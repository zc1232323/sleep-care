@echo off
chcp 65001 >nul 2>&1
title SleepCare 数据库查询工具
echo.
echo ==========================================
echo   正在查询 SQLite 数据库...
echo ==================================
echo.
cd /d "%~dp0"
node query-db.js
echo.
pause
