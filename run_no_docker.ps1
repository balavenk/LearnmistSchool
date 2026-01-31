# Run Local Environment (No Docker)
Write-Host "Starting LearnmistSchool Locally (No Docker)..."

# 1. Start Backend
Write-Host "Likely launching Backend in a new window..."
# check if venv exists
if (-not (Test-Path "backend\venv")) {
    Write-Error "Backend venv not found! Please run 'python -m venv venv' in backend folder first."
    exit 1
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\activate; uvicorn main:app --reload"

# 2. Start Frontend
Write-Host "Launching Frontend in a new window..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"

Write-Host "------------------------------------------------"
Write-Host "Services starting in new windows."
Write-Host "Backend: http://localhost:8000"
Write-Host "Frontend: http://localhost:5173"
Write-Host "------------------------------------------------"
