@echo off
:: ============================================================
::  FamilySphere — CMD Helper
::  Usage: git-helper.cmd [command]
::
::  Commands:
::    status   - show git status
::    push     - add all, commit, push
::    pull     - pull latest from origin/main
::    log      - show last 10 commits
::    branch   - list branches
:: ============================================================

setlocal

set CMD=%1

if "%CMD%"=="" goto help
if "%CMD%"=="status" goto status
if "%CMD%"=="push" goto push
if "%CMD%"=="pull" goto pull
if "%CMD%"=="log" goto log
if "%CMD%"=="branch" goto branch
goto help

:status
echo.
echo [FamilySphere] Git Status
echo ─────────────────────────
git status
goto end

:push
echo.
set /p MSG="Enter commit message: "
git add .
git commit -m "%MSG%"
git push
echo.
echo [OK] Pushed to GitHub!
goto end

:pull
echo.
echo [FamilySphere] Pulling latest from origin/main...
git pull origin main
goto end

:log
echo.
echo [FamilySphere] Last 10 commits:
echo ─────────────────────────────────
git log --oneline -10
goto end

:branch
echo.
echo [FamilySphere] Branches:
git branch -a
goto end

:help
echo.
echo  FamilySphere Git Helper
echo  ───────────────────────
echo  Usage: git-helper.cmd [command]
echo.
echo  Commands:
echo    status   Show current git status
echo    push     Stage all, commit, and push to GitHub
echo    pull     Pull latest from GitHub
echo    log      Show last 10 commits
echo    branch   List all branches
echo.

:end
endlocal
