@echo off
setlocal

:: ====================================================================
:: CampusCarbon AI — Windows Stop Script
:: Stops Backend (port 8000) and Frontend (port 5173).
:: Use: stop.bat --all to also stop the PostgreSQL Docker container.
:: ====================================================================

title CampusCarbon AI — Stopping Services

python run.py --stop %*

if %ERRORLEVEL% neq 0 (
    echo.
    pause
)
