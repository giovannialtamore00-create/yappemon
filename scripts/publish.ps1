# One-time publish to GitHub Pages (Windows PowerShell).
# Run from the project folder:   powershell -ExecutionPolicy Bypass -File scripts\publish.ps1
# Optional repo name:            powershell -ExecutionPolicy Bypass -File scripts\publish.ps1 -Repo my-game
param([string]$Repo = "yappemon")
$ErrorActionPreference = "Stop"

function Find-Gh {
  $cmd = Get-Command gh -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $default = "C:\Program Files\GitHub CLI\gh.exe"
  if (Test-Path $default) { return $default }
  return $null
}

$gh = Find-Gh
if (-not $gh) {
  Write-Host "Installing GitHub CLI (approve the Windows prompt if one appears)..." -ForegroundColor Cyan
  winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
  $gh = Find-Gh
  if (-not $gh) { throw "GitHub CLI not found after install. Close and reopen PowerShell, then run this script again." }
}

& $gh auth status 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Log in to GitHub (choose GitHub.com, HTTPS, Yes, Login with a web browser)..." -ForegroundColor Cyan
  & $gh auth login --hostname github.com --git-protocol https --web
  if ($LASTEXITCODE -ne 0) { throw "GitHub login failed." }
}
& $gh auth setup-git | Out-Null

$owner = (& $gh api user --jq .login).Trim()
Write-Host "GitHub user: $owner" -ForegroundColor Green

# Create the public repo (no push yet, so Pages can be enabled before the first workflow run).
$hasOrigin = (git remote) -contains "origin"
if (-not $hasOrigin) {
  & $gh repo create $Repo --public --source . --remote origin --description "YAPPEMON - a voice-commanded 3D creature battle game"
  if ($LASTEXITCODE -ne 0) { throw "Could not create repo '$Repo' (does it already exist? run with -Repo another-name)." }
}

# Enable GitHub Pages with "GitHub Actions" as the source.
& $gh api -X POST "repos/$owner/$Repo/pages" -f build_type=workflow 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) { & $gh api -X PUT "repos/$owner/$Repo/pages" -f build_type=workflow | Out-Null }

git push -u origin main
if ($LASTEXITCODE -ne 0) { throw "git push failed." }

Write-Host ""
Write-Host "Pushed! The deploy workflow is running. Watching it (Ctrl+C to stop watching)..." -ForegroundColor Cyan
Start-Sleep -Seconds 8
$runId = (& $gh run list --repo "$owner/$Repo" --limit 1 --json databaseId --jq ".[0].databaseId").Trim()
if ($runId) { & $gh run watch $runId --repo "$owner/$Repo" --exit-status }
Write-Host ""
Write-Host "Your game will be live at: https://$owner.github.io/$Repo/" -ForegroundColor Green
