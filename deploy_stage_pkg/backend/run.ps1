# Run FastAPI Backend Server
# This script activates the virtual environment and starts the Uvicorn server

Write-Host "Starting LearnmistSchool Backend Server..." -ForegroundColor Green

# Activate virtual environment
& ".\venv\Scripts\Activate.ps1"

# Run Uvicorn with the app module
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
