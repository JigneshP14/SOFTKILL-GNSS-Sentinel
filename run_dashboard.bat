@echo off
title DATAV // GNSS SENTINEL DASHBOARD SERVER
color 0B
echo.
echo =============================================================
echo    DATAV // GNSS SENTINEL TELEMETRY ^& DEFENSE PLATFORM
echo =============================================================
echo.
echo [1/3] Checking Node.js installation...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed or not in PATH.
    echo         Download from: https://nodejs.org
    pause
    exit /b 1
)
echo [OK] Node.js found.
echo.
echo [2/3] Starting GNSS Sentinel server on http://localhost:3000 ...
echo       (Keep this window open while using the dashboard)
echo.
echo [3/3] Opening dashboard in Chrome/Edge browser...
timeout /t 2 /nobreak >nul
start "" "http://localhost:3000"
echo.
echo =============================================================
echo   Dashboard is live at: http://localhost:3000
echo   WebSerial (ESP32 COM port) requires Chrome or Edge browser.
echo   Close this window to stop the server.
echo =============================================================
echo.
node "%~dp0server.js"
pause
