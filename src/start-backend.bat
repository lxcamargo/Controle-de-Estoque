@echo off
cd /d %~dp0
set PYTHONPATH=%cd%
uvicorn backend.api:app --reload --port 5174
pause