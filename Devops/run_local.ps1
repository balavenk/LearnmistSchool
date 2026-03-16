# Run Local Development Environment
# - PostgreSQL: Docker (port 5440)
# - Backend API: Local machine (port 8000)
# - Frontend:    Local machine (port 5173)

Write-Host "Starting LearnmistSchool Local Dev Environment..." -ForegroundColor Cyan

# ----------------------------------------------------------------
# 1. Ensure Docker is running
# ----------------------------------------------------------------
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker is not running. Launching Docker Desktop..." -ForegroundColor Yellow
    $dockerDesktopPath = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    if (Test-Path $dockerDesktopPath) {
        Start-Process $dockerDesktopPath
    } else {
        Write-Error "Docker Desktop not found at '$dockerDesktopPath'. Please install or start Docker Desktop manually."
        exit 1
    }

    Write-Host "Waiting for Docker to start (up to 120 seconds)..." -ForegroundColor Yellow
    $timeout = 120
    $elapsed = 0
    do {
        Start-Sleep -Seconds 5
        $elapsed += 5
        docker info > $null 2>&1
        if ($LASTEXITCODE -eq 0) { break }
        Write-Host "  Still waiting... ($elapsed/$timeout seconds)" -ForegroundColor Gray
    } while ($elapsed -lt $timeout)

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker did not start within $timeout seconds. Please start Docker Desktop manually."
        exit 1
    }
    Write-Host "Docker is ready!" -ForegroundColor Green
}

# ----------------------------------------------------------------
# 2. Start ONLY PostgreSQL in Docker
# ----------------------------------------------------------------
Write-Host "`n[1/3] Starting PostgreSQL in Docker..." -ForegroundColor Yellow

# Stop any leftover db container
docker-compose stop db > $null 2>&1
docker-compose rm -f db > $null 2>&1

# Start only the db service
docker-compose up -d db

# Wait for Postgres to be ready
Write-Host "      Waiting for PostgreSQL to be ready..." -ForegroundColor Gray
$pgReady = $false
for ($i = 0; $i -lt 24; $i++) {
    Start-Sleep -Seconds 5
    $pgCheck = docker-compose exec -T db pg_isready -U mist_user -d learnmistschool 2>&1
    if ($LASTEXITCODE -eq 0) {
        $pgReady = $true
        break
    }
    Write-Host "      Still waiting for PostgreSQL... ($($($i+1)*5)s)" -ForegroundColor Gray
}

if (-not $pgReady) {
    Write-Error "PostgreSQL did not become ready in time. Check Docker logs with: docker-compose logs db"
    exit 1
}
Write-Host "      PostgreSQL is ready!" -ForegroundColor Green

# ----------------------------------------------------------------
# 3. Start Backend locally (port 8000)
# ----------------------------------------------------------------
Write-Host "`n[2/3] Starting Backend API on port 8000..." -ForegroundColor Yellow

if (-not (Test-Path "backend\venv")) {
    Write-Error "Backend venv not found! Run 'python -m venv venv' inside the backend folder first."
    exit 1
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Write-Host 'Backend API Starting...' -ForegroundColor Cyan; " + `
    "Set-Location '$PWD\backend'; " + `
    ".\venv\Scripts\Activate.ps1; " + `
    "uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

Write-Host "      Backend started in a new window." -ForegroundColor Green

# ----------------------------------------------------------------
# 4. Start Frontend locally (port 5173)
# ----------------------------------------------------------------
Write-Host "`n[3/3] Starting Frontend on port 5173..." -ForegroundColor Yellow

if (-not (Test-Path "frontend\node_modules")) {
    Write-Error "Frontend node_modules not found! Run 'npm install' inside the frontend folder first."
    exit 1
}

Start-Process powershell -ArgumentList "-NoExit", "-Command", `
    "Write-Host 'Frontend Starting...' -ForegroundColor Cyan; " + `
    "Set-Location '$PWD\frontend'; " + `
    "npm run dev"

Write-Host "      Frontend started in a new window." -ForegroundColor Green

# ----------------------------------------------------------------
# Summary
# ----------------------------------------------------------------
Write-Host "`n------------------------------------------------" -ForegroundColor Cyan
Write-Host " Local Dev Environment is Starting!" -ForegroundColor Green
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host " PostgreSQL:  Docker  -> localhost:5440"
Write-Host " Backend API: Local   -> http://localhost:8000"
Write-Host " Frontend:    Local   -> http://localhost:5173"
Write-Host " API Docs:    Local   -> http://localhost:8000/docs"
Write-Host " Login:       superadmin / admin123"
Write-Host "------------------------------------------------" -ForegroundColor Cyan
Write-Host " PostgreSQL logs: docker-compose logs -f db"
Write-Host "------------------------------------------------`n" -ForegroundColor Cyan
