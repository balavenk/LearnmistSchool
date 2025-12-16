# Run Local Environment
Write-Host "Starting LearnmistSchool Locally..."

# Check if Docker is running
docker info > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker is NOT running. Please start Docker Desktop and try again."
    exit 1
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
