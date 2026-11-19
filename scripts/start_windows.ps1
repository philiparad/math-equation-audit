# Run in PowerShell: powershell -ExecutionPolicy Bypass -File .\scripts\start_windows.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path '.venv\Scripts\python.exe')) {
    py -m venv .venv
}
$Python = '.venv\Scripts\python.exe'
& $Python -m pip install -r requirements.txt
if (-not (Test-Path '.env')) {
    Copy-Item '.env.example' '.env'
}
Write-Host 'Opening MathAudit at http://127.0.0.1:8000' -ForegroundColor Cyan
& $Python -m uvicorn backend.app:app --env-file .env --host 127.0.0.1 --port 8000
