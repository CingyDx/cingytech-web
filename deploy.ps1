param(
  [string]$message = "Update website"
)

Set-Location $PSScriptRoot

Write-Host "Kontroluju změny..." -ForegroundColor Cyan
git status --short

if (-not (git status --porcelain)) {
  Write-Host "Nic k odeslani, working tree je clean." -ForegroundColor Green
  exit 0
}

git add .
git commit -m "$message"

if ($LASTEXITCODE -ne 0) {
  Write-Host "Commit selhal." -ForegroundColor Red
  exit 1
}

git push

if ($LASTEXITCODE -eq 0) {
  Write-Host "Hotovo. Web byl pushnuty na GitHub a Netlify ho nasadi automaticky." -ForegroundColor Green
} else {
  Write-Host "Push selhal. Zkontroluj vypis vyse." -ForegroundColor Red
}
