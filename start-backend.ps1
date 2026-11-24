Set-Location -Path "$PSScriptRoot\backend"
Write-Host "Starting Autonomous Enterprise Intelligence System Backend..." -ForegroundColor Cyan
Write-Host "API available at: http://localhost:8000" -ForegroundColor Green
Write-Host "API Docs at:      http://localhost:8000/docs" -ForegroundColor Green
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
