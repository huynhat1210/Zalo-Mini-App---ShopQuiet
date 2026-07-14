param(
  [int]$Port = 3000
)

Write-Host "Starting ngrok in background and injecting URL into apps/zalo-mini-app/.env..." -ForegroundColor Cyan

# Start ngrok in a new hidden window so we can query its API
$ngrokArgs = "http $Port"
$ngrokProc = Start-Process -FilePath ngrok -ArgumentList $ngrokArgs -PassThru -WindowStyle Hidden

# Poll ngrok local API for tunnel info
$apiUrl = 'http://127.0.0.1:4040/api/tunnels'
$publicUrl = $null
$maxAttempts = 30
for ($i = 0; $i -lt $maxAttempts; $i++) {
  try {
    $resp = Invoke-RestMethod -Uri $apiUrl -UseBasicParsing -ErrorAction Stop
    if ($resp.tunnels -and $resp.tunnels.Count -gt 0) {
      $publicUrl = $resp.tunnels[0].public_url
      break
    }
  } catch {
    # ignore, ngrok may not be ready yet
  }
  Start-Sleep -Seconds 1
}

if (-not $publicUrl) {
  Write-Host "Failed to get ngrok public URL after waiting." -ForegroundColor Red
  exit 1
}

Write-Host "Ngrok public URL: $publicUrl" -ForegroundColor Green

# Path to the Zalo mini app .env
$repoRoot = Resolve-Path "$PSScriptRoot\..\.."
$envPath = Join-Path $repoRoot 'apps\zalo-mini-app\.env'

if (-not (Test-Path $envPath)) {
  Write-Host ".env file not found at $envPath; creating a new one." -ForegroundColor Yellow
  New-Item -ItemType File -Path $envPath -Force | Out-Null
}

$backupPath = "$envPath.ngrok.bak"
# Backup original .env if backup not exists
if (-not (Test-Path $backupPath)) {
  try {
    Copy-Item -Path $envPath -Destination $backupPath -Force -ErrorAction Stop
    Write-Host "Backed up original .env to $backupPath" -ForegroundColor Yellow
  } catch {
    # If file doesn't exist, create empty backup
    "" | Out-File -FilePath $backupPath -Encoding UTF8
    Write-Host "Created empty backup $backupPath" -ForegroundColor Yellow
  }
}

# Read, update or append VITE_API_BASE_URL
$lines = Get-Content $envPath -ErrorAction SilentlyContinue
$key = 'VITE_API_BASE_URL'
$apiPath = $publicUrl
if (-not $apiPath.EndsWith('/api')) { $apiPath = $apiPath.TrimEnd('/') + '/api' }
$newLine = "$key=$apiPath"
$found = $false
for ($j = 0; $j -lt $lines.Length; $j++) {
  if ($lines[$j] -match "^$key\s*=") {
    $lines[$j] = $newLine
    $found = $true
    break
  }
}
if (-not $found) {
  $lines += $newLine
}

Set-Content -Path $envPath -Value $lines -Encoding UTF8
Write-Host "Updated $envPath with $newLine" -ForegroundColor Green

# Start the monorepo dev servers in a new PowerShell window
Write-Host "Starting monorepo dev servers (pnpm run dev) in a new window..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-Command','pnpm run dev' -WindowStyle Normal

Write-Host "All set - dev servers started and ngrok tunnel running." -ForegroundColor Green
