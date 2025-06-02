@echo off
setlocal enabledelayedexpansion

REM TaskMaster AI Update Script for Windows
REM This script helps users update their global TaskMaster AI installation

echo 🔄 TaskMaster AI Update Script
echo ================================
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install Node.js and npm first.
    pause
    exit /b 1
)

REM Check current installed version
echo ℹ️  Checking current installation...
task-hero --version >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=*" %%i in ('task-hero --version 2^>nul') do (
        for /f "tokens=2" %%j in ("%%i") do set CURRENT_VERSION=%%j
    )
    echo ℹ️  Current version: !CURRENT_VERSION!
) else (
    echo ⚠️  TaskMaster AI not currently installed globally
    set CURRENT_VERSION=not installed
)

REM Check latest version on npm
echo ℹ️  Checking latest version on npm...
for /f "tokens=*" %%i in ('npm view task-hero-ai version 2^>nul') do set LATEST_VERSION=%%i
if "!LATEST_VERSION!"=="" (
    echo ❌ Could not fetch latest version from npm
    pause
    exit /b 1
)
echo ℹ️  Latest version: !LATEST_VERSION!

REM Compare versions
if "!CURRENT_VERSION!"=="!LATEST_VERSION!" if not "!CURRENT_VERSION!"=="not installed" (
    echo ✅ You already have the latest version (!CURRENT_VERSION!)
    echo.
    echo If you're experiencing issues, you can force reinstall with:
    echo   npm uninstall -g task-hero-ai ^&^& npm install -g task-hero-ai
    pause
    exit /b 0
)

REM Confirm update
echo.
if "!CURRENT_VERSION!"=="not installed" (
    echo ℹ️  Installing TaskMaster AI v!LATEST_VERSION!...
) else (
    echo ℹ️  Updating from v!CURRENT_VERSION! to v!LATEST_VERSION!...
)

set /p CONFIRM="Continue? (y/N): "
if /i not "!CONFIRM!"=="y" if /i not "!CONFIRM!"=="yes" (
    echo ⚠️  Update cancelled
    pause
    exit /b 0
)

REM Perform update
echo.
echo ℹ️  Starting update process...

REM Step 1: Uninstall current version (if installed)
if not "!CURRENT_VERSION!"=="not installed" (
    echo ℹ️  Uninstalling current version...
    npm uninstall -g task-hero-ai
    if !errorlevel! neq 0 (
        echo ⚠️  Could not uninstall current version, continuing anyway...
    )
)

REM Step 2: Clear npm cache
echo ℹ️  Clearing npm cache...
npm cache clean --force
if !errorlevel! neq 0 (
    echo ⚠️  Could not clear npm cache, continuing anyway...
)

REM Step 3: Install latest version
echo ℹ️  Installing latest version...
npm install -g task-hero-ai
if !errorlevel! equ 0 (
    echo ✅ Installation completed successfully!
) else (
    echo ❌ Installation failed!
    echo.
    echo Try running this script as Administrator or check your npm configuration.
    echo.
    echo You can also try:
    echo   npm config set prefix %APPDATA%\npm
    echo   npm install -g task-hero-ai
    pause
    exit /b 1
)

REM Step 4: Verify installation
echo ℹ️  Verifying installation...
task-hero --version >nul 2>nul
if !errorlevel! equ 0 (
    for /f "tokens=*" %%i in ('task-hero --version 2^>nul') do (
        for /f "tokens=2" %%j in ("%%i") do set NEW_VERSION=%%j
    )
    if "!NEW_VERSION!"=="!LATEST_VERSION!" (
        echo ✅ Update successful! TaskMaster AI v!NEW_VERSION! is now installed.
    ) else (
        echo ⚠️  Update completed but version mismatch detected.
        echo ⚠️  Expected: !LATEST_VERSION!, Got: !NEW_VERSION!
    )
) else (
    echo ❌ TaskMaster AI command not found after installation!
    echo ❌ You may need to restart your command prompt or update your PATH.
    pause
    exit /b 1
)

REM Final instructions
echo.
echo ✅ Update complete!
echo.
echo You can now use TaskMaster AI with:
echo   task-hero --help
echo   task-hero menu
echo   task-hero init
echo.
echo ℹ️  If you encounter any issues, please check:
echo   - Your PATH includes the npm global bin directory
echo   - You have proper permissions for global npm packages
echo   - Try restarting your command prompt
echo.
pause
