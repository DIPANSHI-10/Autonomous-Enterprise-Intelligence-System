Set-Location -Path "$PSScriptRoot\frontend"
Write-Host "Starting Autonomous Enterprise Intelligence System Frontend..." -ForegroundColor Cyan
Write-Host "App available at: http://localhost:5173" -ForegroundColor Green
npm run dev
