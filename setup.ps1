# ============================================================
#  FamilySphere — Environment Setup Script
#  Run: .\setup.ps1
# ============================================================

$Host.UI.RawUI.WindowTitle = "FamilySphere Setup"
$ErrorActionPreference = "Stop"

function Write-Header  { Write-Host "`n========================================" -ForegroundColor Cyan
                         Write-Host "  $args" -ForegroundColor Cyan
                         Write-Host "========================================" -ForegroundColor Cyan }
function Write-OK      { Write-Host "  [OK]  $args" -ForegroundColor Green }
function Write-WARN    { Write-Host "  [!!]  $args" -ForegroundColor Yellow }
function Write-ERR     { Write-Host "  [XX]  $args" -ForegroundColor Red }
function Write-INFO    { Write-Host "  [..]  $args" -ForegroundColor DarkCyan }

Write-Header "FamilySphere — Project Environment Setup"

# ── 1. Check required tools ──────────────────────────────────
Write-Header "Step 1: Checking Required Tools"

# Node.js
try {
    $nodeVer = node --version 2>&1
    Write-OK "Node.js  $nodeVer"
} catch {
    Write-ERR "Node.js NOT found. Download: https://nodejs.org"
    exit 1
}

# npm
try {
    $npmVer = npm --version 2>&1
    Write-OK "npm      v$npmVer"
} catch {
    Write-ERR "npm NOT found (should come with Node.js)."
    exit 1
}

# Git
try {
    $gitVer = git --version 2>&1
    Write-OK "Git      $gitVer"
} catch {
    Write-ERR "Git NOT found. Download: https://git-scm.com"
    exit 1
}

# GitHub CLI (optional)
try {
    $ghVer = gh --version 2>&1 | Select-Object -First 1
    Write-OK "GitHub CLI $ghVer"
} catch {
    Write-WARN "GitHub CLI (gh) not found — optional. Install: https://cli.github.com"
}

# ── 2. Git identity check ────────────────────────────────────
Write-Header "Step 2: Git Identity"

$gitName  = git config --global user.name  2>&1
$gitEmail = git config --global user.email 2>&1

if ($gitName -and $gitEmail) {
    Write-OK "Git user : $gitName <$gitEmail>"
} else {
    Write-WARN "Git identity not set globally. Setting now..."
    $name  = Read-Host "  Enter your full name"
    $email = Read-Host "  Enter your email"
    git config --global user.name  "$name"
    git config --global user.email "$email"
    Write-OK "Git identity saved."
}

# ── 3. Ensure line-ending config ─────────────────────────────
Write-Header "Step 3: Git Line-Endings (Windows)"
git config --global core.autocrlf true
git config --global core.safecrlf warn
Write-OK "core.autocrlf=true  |  core.safecrlf=warn"

# ── 4. Verify remote ─────────────────────────────────────────
Write-Header "Step 4: Remote Repository"
$remote = git remote get-url origin 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-OK "origin → $remote"
} else {
    Write-WARN "No remote 'origin' found."
    $repo = Read-Host "  Paste your GitHub repo URL (or press Enter to skip)"
    if ($repo) {
        git remote add origin $repo
        Write-OK "Remote added: $repo"
    }
}

# ── 5. Create backend .env if missing ────────────────────────
Write-Header "Step 5: Backend .env File"
$envPath = "backend\.env"
if (Test-Path $envPath) {
    Write-OK ".env already exists — skipping."
} else {
    Write-INFO "Creating backend\.env from template..."
    @"
# ── Server ──────────────────────────
PORT=5000

# ── Auth ─────────────────────────────
JWT_SECRET=familysphere_super_secret_key_CHANGE_ME

# ── Gemini AI (optional) ─────────────
# GEMINI_API_KEY=your_gemini_api_key_here
"@ | Set-Content $envPath -Encoding UTF8
    Write-OK ".env created. Edit backend\.env to add your secrets."
}

# ── 6. Install dependencies ──────────────────────────────────
Write-Header "Step 6: Installing Dependencies"
Write-INFO "Running npm install at root (installs all workspaces)..."
npm install
Write-OK "All dependencies installed."

# ── 7. Print summary ─────────────────────────────────────────
Write-Header "Setup Complete!"
Write-Host ""
Write-Host "  Start development servers:" -ForegroundColor White
Write-Host "    npm run dev              (backend + frontend together)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Or start individually:" -ForegroundColor White
Write-Host "    npm run dev-backend      (port 5000)" -ForegroundColor Yellow
Write-Host "    npm run dev-frontend     (port 3000)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Seed the database:" -ForegroundColor White
Write-Host "    npm run seed" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Git shortcuts:" -ForegroundColor White
Write-Host "    git status               see what changed" -ForegroundColor Yellow
Write-Host "    git add .                stage all changes" -ForegroundColor Yellow
Write-Host "    git commit -m 'message'  commit changes" -ForegroundColor Yellow
Write-Host "    git push                 push to GitHub" -ForegroundColor Yellow
Write-Host "    git pull                 pull latest from GitHub" -ForegroundColor Yellow
Write-Host ""
Write-Host "  GitHub repo:" -ForegroundColor White
Write-Host "    https://github.com/shubhamsirse507-jpg/-familysphere" -ForegroundColor Cyan
Write-Host ""
