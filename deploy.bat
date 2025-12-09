@echo off
setlocal

REM Simple wrapper to run PowerShell deploy script
powershell -ExecutionPolicy Bypass -File "%~dp0deploy.ps1" %*

endlocal
