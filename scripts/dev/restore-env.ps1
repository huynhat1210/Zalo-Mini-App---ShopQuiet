param(
  [string]$AppEnvPath = "apps\zalo-mini-app\.env"
)

$repoRoot = Resolve-Path "$PSScriptRoot\..\.."
$envPath = Join-Path $repoRoot $AppEnvPath
$backupPath = "$envPath.ngrok.bak"

if (-not (Test-Path $backupPath)) {
    Write-Host "No backup file found at $backupPath. Nothing to restore." -ForegroundColor Yellow
    exit 0
}

try {
    Copy-Item -Path $backupPath -Destination $envPath -Force -ErrorAction Stop
    Write-Host "Restored $envPath from $backupPath" -ForegroundColor Green
} catch {
    Write-Host "Failed to restore .env: $_" -ForegroundColor Red
    exit 1
}

Write-Host "You can remove the backup file if everything looks good:" -ForegroundColor Cyan
Write-Host "  Remove-Item -Path $backupPath" -ForegroundColor Cyan
