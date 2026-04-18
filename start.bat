@echo off
title School Forum Server
echo =======================================================
echo                School Forum Server          
echo =======================================================                                                       
echo.

cd /d "%~dp0"

:: Check Node.js
where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found, please install Node.js first
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
    echo [DONE] Dependencies installed
    echo.
)

:: Start Redis if exists
if exist "Redis\redis-server.exe" (
    echo [INFO] Starting Redis...
    start "Redis Server" "Redis\start.bat"
    timeout /t 2 /nobreak >nul
)

echo [INFO] Starting server...
echo ========================================
echo.

node server.js

pause