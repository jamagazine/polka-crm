@echo off
chcp 65001 >nul
title ПОЛКА CRM - Запуск
cd /d "%~dp0"

echo ========================================
echo   ПОЛКА CRM - Запуск сервера разработки
echo ========================================
echo.

echo Устанавливаю зависимости...

REM --- Установка зависимостей ---
call npm install
if errorlevel 1 (
    echo.
    echo [ОШИБКА] Не удалось установить зависимости!
    pause
    exit /b 1
)

echo.
echo Запускаю сервер разработки...
echo.
call npm run dev
if errorlevel 1 (
    echo.
    echo [ОШИБКА] Сервер завершился с ошибкой.
)
pause
