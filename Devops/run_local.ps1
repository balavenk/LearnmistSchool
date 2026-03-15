# Run Local Environment
Write-Host "Starting LearnmistSchool Locally..."

# Check if Docker is running, launch it if not
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
        Write-Error "Docker did not start within $timeout seconds. Please start Docker Desktop manually and try again."
        exit 1
    }
    Write-Host "Docker is ready!" -ForegroundColor Green
}

# Stop existing
Write-Host "Stopping old containers..."
docker-compose down --remove-orphans

# Build and Start
Write-Host "Building and Starting..."
docker-compose up -d --build --force-recreate

# Wait for DB
Write-Host "Waiting 30s for Database to initialize..."
Start-Sleep -Seconds 30

# Run Seed
Write-Host "Seeding Database..."
$backendId = docker ps -qf "name=backend"
if ($backendId) {
    docker exec $backendId python create_admin_direct.py
    Write-Host "Seed completed."
} else {
    Write-Error "Backend container not found!"
}

Write-Host "------------------------------------------------"
Write-Host "Local Environment Running!"
Write-Host "Frontend: http://localhost"
Write-Host "Backend:  http://localhost:8000"
Write-Host "Login:    superadmin / admin123"
Write-Host "------------------------------------------------"
Write-Host "To view logs: docker-compose logs -f"
