@echo off
chcp 65001 >nul
title ПОЛКА CRM - Запуск
cd /d "%~dp0"

echo ========================================
echo   ПОЛКА CRM - Запуск сервера разработки
echo ========================================
echo.

REM --- Проверяем наличие pnpm ---
where pnpm >nul 2>nul
if %errorlevel%==0 (
    set PNPM_CMD=pnpm
    echo [OK] pnpm найден
) else (
    echo [..] pnpm не найден, используем npx pnpm...
    set PNPM_CMD=npx -y pnpm
)

echo.
echo Устанавливаю зависимости...

REM --- Установка зависимостей ---
REM Раскомментируй строку ниже при медленном интернете:
REM call %PNPM_CMD% install --network-concurrency 1

call %PNPM_CMD% install --no-frozen-lockfile
if errorlevel 1 (
    echo.
    echo [ОШИБКА] Не удалось установить зависимости!
    pause
    exit /b 1
)

echo.
echo Запускаю сервер разработки...
echo.
call %PNPM_CMD% dev
if errorlevel 1 (
    echo.
    echo [ОШИБКА] Сервер завершился с ошибкой.
)
pause
