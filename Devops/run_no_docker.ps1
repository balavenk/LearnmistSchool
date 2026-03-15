# Run Local Environment (No Docker)
Write-Host "Starting LearnmistSchool Locally (No Docker)..."

# 1. Start Backend
Write-Host "Launching Backend in a new window..."
if (-not (Test-Path "backend\venv")) {
    Write-Error "Backend venv not found! Please run 'python -m venv venv' in the backend folder first."
    exit 1
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location backend; C:\Python310\Scripts\uvicorn.exe app.main:app --reload"

# 2. Start Frontend
Write-Host "Launching Frontend in a new window..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location frontend; npm run dev"

Write-Host "------------------------------------------------"
Write-Host "Services starting in new windows."
Write-Host "Backend:  http://localhost:8000"
Write-Host "Frontend: http://localhost:5173"
Write-Host "Docs:     http://localhost:8000/docs"
Write-Host "------------------------------------------------"
