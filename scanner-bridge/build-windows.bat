@echo off
echo =====================================================
echo  Stock Manager Scanner Bridge - Windows build
echo =====================================================
echo.

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm not found. Install Node.js from https://nodejs.org first.
    pause
    exit /b 1
)
where dotnet >nul 2>nul
if errorlevel 1 (
    echo [ERROR] .NET SDK not found. Install from https://dotnet.microsoft.com/download
    echo Minimum: .NET 8.0 SDK
    pause
    exit /b 1
)

echo [1/4] Installing Node dependencies (first run only)...
call npm install
if errorlevel 1 goto :fail

echo.
echo [2/4] Building C# ScannerHelper (uses WinBio + SourceAFIS)...
pushd native
call dotnet publish -c Release -r win-x64 --self-contained false -o ..\resources\bin
popd
if errorlevel 1 goto :fail

echo.
echo [3/4] Building React renderer...
call npm run build:renderer
if errorlevel 1 goto :fail

echo.
echo [4/4] Packaging Windows installer...
call npm run build:win
if errorlevel 1 goto :fail

echo.
echo =====================================================
echo  DONE. Installer is in: release\
echo  Look for:  Stock Manager Scanner Bridge Setup 1.0.0.exe
echo =====================================================
pause
exit /b 0

:fail
echo.
echo [ERROR] Build failed. See output above.
pause
exit /b 1
