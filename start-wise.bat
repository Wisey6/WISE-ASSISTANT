@echo off
REM Double-click launcher for Wise on Windows. No need to remember
REM `cd WISE-ASSISTANT` first — this script always runs from its own
REM folder, pulls the latest code, and starts Metro with a cache flush.
cd /d "%~dp0"
echo.
echo === Pulling latest code ===
git pull
if errorlevel 1 (
  echo.
  echo Git pull failed — check your internet / GitHub auth and try again.
  pause
  exit /b 1
)
echo.
echo === Starting Expo dev server (cache cleared) ===
call npx expo start --clear
pause
