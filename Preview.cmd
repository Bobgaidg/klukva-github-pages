@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required for local preview: https://nodejs.org/
  pause
  exit /b 1
)
echo Open http://127.0.0.1:4173/klukva-github-pages/ in your browser.
echo Keep this window open. Press Ctrl+C to stop.
node tools/preview.mjs
if errorlevel 1 pause
