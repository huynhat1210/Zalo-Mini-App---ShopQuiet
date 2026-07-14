param(
  [int]$Port = 3000
)

Write-Host "Starting ngrok tunnel for http://localhost:$Port" -ForegroundColor Yellow

# Assumes `ngrok` is installed and the user has already authenticated (ngrok authtoken)
ngrok http $Port
