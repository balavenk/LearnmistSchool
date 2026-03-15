param (
    [string]$InstanceName = "learnmist-server",
    [string]$Zone = "us-central1-a"
)

$ErrorActionPreference = "Stop"
$ProjectId = "project-7b2578b2-0b43-448e-80c"

# 1. Build Frontend Locally
Write-Host "Building Frontend..." -ForegroundColor Cyan
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build failed"; exit 1 }
Set-Location ..

# 2. Package Everything
Write-Host "Packaging Application..." -ForegroundColor Cyan
try {
    # Remove old pack
    if (Test-Path "deploy_pack.zip") { Remove-Item "deploy_pack.zip" -Force }
    
    # Use tar to handle paths/permissions better (produces .zip if instructed or .tar.gz)
    # We'll stick to simple zip if possible, but Windows 'tar' supports it?
    # Actually, let's use tar -czvf deploy_pack.tar.gz backend frontend/dist Dockerfile docker-compose.yml
    # And update remote script to tar -xzvf
    
    tar.exe -czvf deploy_pack.tar.gz --exclude "venv" backend frontend/dist Dockerfile docker-compose.yml
    if ($LASTEXITCODE -ne 0) { throw "Tar failed" }
} catch {
    Write-Error "Packaging Failed: $_"
    exit 1
}

# 3. Upload
Write-Host "Uploading to VM..." -ForegroundColor Cyan
gcloud compute scp deploy_pack.tar.gz ${InstanceName}:~/deploy_pack.tar.gz --zone=$Zone --project=$ProjectId
if ($LASTEXITCODE -ne 0) { throw "Upload Failed" }

# 4. Remote Execution
Write-Host " executing Remote Deployment..." -ForegroundColor Cyan
$remoteScript = '
    # Clean workspace
    rm -rf app_clean
    mkdir -p app_clean
    
    # Extract
    tar -xzvf deploy_pack.tar.gz -C app_clean
    
    # Move to deployment dir
    cd app_clean
    
    # Build Docker
    docker build -t app_web_final .
    
    # Stop old
    docker stop app_direct || true
    docker rm app_direct || true
    
    # Run new
    docker run -d --name app_direct -p 80:8000 --restart always app_web_final
'

gcloud compute ssh $InstanceName --zone=$Zone --project=$ProjectId --command="$remoteScript"
