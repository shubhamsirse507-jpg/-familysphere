# ============================================================
#  FamilySphere — Quick Dev Launcher
#  Run: .\dev.ps1
#  Opens backend (port 5000) + frontend (port 3000) side by side
# ============================================================

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n[FamilySphere] Starting development servers..." -ForegroundColor Cyan
Write-Host "  Backend  → http://localhost:5000" -ForegroundColor Yellow
Write-Host "  Frontend → http://localhost:3000" -ForegroundColor Yellow
Write-Host ""

# Launch backend in a new PowerShell window
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$root'; Write-Host '[BACKEND] Starting on port 5000...' -ForegroundColor Green; npm run dev-backend"
)

# Small delay so ports don't race
Start-Sleep -Milliseconds 800

# Launch frontend in a new PowerShell window
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "cd '$root'; Write-Host '[FRONTEND] Starting on port 3000...' -ForegroundColor Magenta; npm run dev-frontend"
)

Write-Host "[FamilySphere] Both servers launched in separate windows." -ForegroundColor Cyan
Write-Host "  Press Ctrl+C in each window to stop." -ForegroundColor DarkGray
