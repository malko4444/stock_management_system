@echo off
echo Building ScannerHelper.exe ...
where dotnet >nul 2>nul
if errorlevel 1 (
    echo [ERROR] .NET SDK not found. Install from https://dotnet.microsoft.com/download
    pause
    exit /b 1
)
dotnet publish -c Release -r win-x64 --self-contained false -o ..\resources\bin
if errorlevel 1 (
    echo [ERROR] Build failed.
    pause
    exit /b 1
)
echo.
echo DONE. ScannerHelper.exe is in ..\resources\bin\
pause
