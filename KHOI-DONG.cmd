@echo off
chcp 65001 >nul
cd /d "%~dp0"
title 20/10 Minigame Studio
if not exist "runtime\node.exe" (
  echo Khong tim thay bo chay. Hay giai nen day du goi Windows.
  echo Vui long dung ban 20-10-Minigame-Studio-Windows.zip.
  pause
  exit /b 1
)
echo Dang mo 20/10 Minigame Studio...
echo Giu cua so nay mo trong su kien. Dong cua so de dung ung dung.
start "" /b powershell -NoProfile -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:2010'"
"runtime\node.exe" server.mjs
pause
