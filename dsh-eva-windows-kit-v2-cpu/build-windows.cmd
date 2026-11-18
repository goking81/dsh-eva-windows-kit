@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 24 was not found. Install it from https://nodejs.org/dist/latest-v24.x/ and run this file again.
  pause
  exit /b 1
)
node "%~dp0build-windows.mjs" %*
set CODE=%ERRORLEVEL%
echo.
if "%CODE%"=="0" (echo Finished.) else (echo Stopped with exit code %CODE%. See the messages above.)
pause
exit /b %CODE%
