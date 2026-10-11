@echo off
setlocal enabledelayedexpansion

:: ====================================================================
:: CampusCarbon AI — Windows Quick Launcher
:: Organization: Amrita Vishwa Vidyapeetham | Coimbatore Campus
:: Double-click this file to start the entire platform!
:: ====================================================================

title CampusCarbon AI — Launcher

echo.
echo ====================================================================
echo      Starting CampusCarbon AI Platform...
echo      Amrita Vishwa Vidyapeetham — Coimbatore Campus
echo ====================================================================
echo.

:: 1. Check Python installation
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not found in your PATH!
    echo Please install Python 3.10 or higher from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

:: 2. Check Node.js installation
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in your PATH!
    echo Please install Node.js 18 or higher from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 3. Run platform orchestrator
python run.py %*

if %ERRORLEVEL% neq 0 (
    echo.
    echo [NOTICE] Platform exited with code %ERRORLEVEL%.
    pause
)
