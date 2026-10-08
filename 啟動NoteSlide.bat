@echo off
chcp 65001 >nul
title NoteSlide Studio 智慧簡報服務 (FastAPI + RapidOCR)

echo =========================================================
echo      🚀 正在啟動 NoteSlide Studio 智慧簡報服務...
echo      NotebookLM 投影片轉可編輯 PPTX + 本地 AI OCR 引擎
echo =========================================================
echo.

cd /d "%~dp0"

echo 正在啟動伺服器 (http://127.0.0.1:8000)...
start http://127.0.0.1:8000
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload

pause
