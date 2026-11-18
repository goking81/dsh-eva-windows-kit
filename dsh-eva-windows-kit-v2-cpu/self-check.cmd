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
node "%~dp0self-check.mjs" %*
pause
