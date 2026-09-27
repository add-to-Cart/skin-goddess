@echo off
REM ============================================================
REM  Skin Goddess — Build launcher.exe with PyInstaller
REM ============================================================
REM
REM  PREREQUISITES (one-time setup):
REM    cd launcher
REM    ..\server\venv\Scripts\pip install pyinstaller
REM
REM  THEN run this script:
REM    build_launcher.bat
REM
REM  OUTPUT: launcher\dist\SkinGoddess.exe
REM ============================================================

setlocal

set SCRIPT_DIR=%~dp0
set VENV_PY=%SCRIPT_DIR%..\server\venv\Scripts\python.exe
set ICON=%SCRIPT_DIR%skin_goddess.ico
set DIST=%SCRIPT_DIR%dist
set SPEC=%SCRIPT_DIR%SkinGoddess.spec

echo.
echo  Skin Goddess Launcher Builder
echo  ==============================

REM Check venv Python exists
if not exist "%VENV_PY%" (
    echo  ERROR: Python venv not found at:
    echo         %VENV_PY%
    echo  Run:  cd ..\server ^&^& py -m venv venv ^&^& pip install -r requirements.txt
    pause
    exit /b 1
)

REM Check PyInstaller is installed
"%VENV_PY%" -c "import PyInstaller" 2>nul
if errorlevel 1 (
    echo.
    echo  PyInstaller is not installed in the venv.
    echo  Install it first:
    echo.
    echo    ..\server\venv\Scripts\pip install pyinstaller
    echo.
    pause
    exit /b 1
)

echo  Building SkinGoddess.exe...
echo.

"%VENV_PY%" -m PyInstaller ^
    --onefile ^
    --windowed ^
    --name "SkinGoddess" ^
    --icon "%ICON%" ^
    --distpath "%DIST%" ^
    --workpath "%SCRIPT_DIR%build_temp" ^
    --specpath "%SCRIPT_DIR%" ^
    --add-data "%ICON%;." ^
    launcher.py

if errorlevel 1 (
    echo.
    echo  Build FAILED. See output above.
    pause
    exit /b 1
)

echo.
echo  ============================================================
echo   Build complete!
echo   EXE location: %DIST%\SkinGoddess.exe
echo  ============================================================
echo.
echo  To create a desktop shortcut:
echo    1. Right-click  dist\SkinGoddess.exe
echo    2. Send to -^> Desktop (create shortcut)
echo    3. Right-click the shortcut -^> Properties
echo    4. Change icon to skin_goddess.ico
echo.
pause
