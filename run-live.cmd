@echo off
setlocal

cd /d "%~dp0"

if not exist ".codex-backups" mkdir ".codex-backups"

echo [1/4] Cleaning old containers...
docker compose down >nul 2>&1

echo [2/4] Building images quietly...
docker compose build > ".codex-backups\last-build.log" 2>&1
if errorlevel 1 (
  echo [ERROR] Build failed. Showing saved build log.
  type ".codex-backups\last-build.log"
  exit /b 1
)

echo [3/4] Starting services...
docker compose up -d > ".codex-backups\last-up.log" 2>&1
if errorlevel 1 (
  echo [ERROR] Service start failed. Showing saved startup log.
  type ".codex-backups\last-up.log"
  exit /b 1
)

echo [4/4] Showing backend logs only. Press Ctrl+C to stop.
docker compose logs backend -f
