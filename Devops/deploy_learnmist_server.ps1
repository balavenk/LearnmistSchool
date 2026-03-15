# deploy_learnmist_server.ps1
# Deploys LearnmistSchool to learnmist-server VM (no Docker).
# VM: learnmist-server | Zone: us-central1-a | Project: project-7b2578b2-0b43-448e-80c

$PROJECT_ID  = "project-7b2578b2-0b43-448e-80c"
$VM_NAME     = "learnmist-server"
$ZONE        = "us-central1-a"
$PACK        = "deploy_pack.tar.gz"

Write-Host "=== LearnmistSchool GCP Deploy ($VM_NAME) ===" -ForegroundColor Green

# ── 1. Set GCP project ──────────────────────────────────────────────────────
Write-Host "[1/5] Setting GCP project..." -ForegroundColor Cyan
gcloud config set project $PROJECT_ID
Write-Host "Project set." -ForegroundColor Green

# ── 2. Build frontend ────────────────────────────────────────────────────────
Write-Host "[2/5] Building frontend..." -ForegroundColor Cyan
Push-Location frontend
    $env:VITE_API_URL = "/"
    npm install --silent
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "npm install failed"; exit 1 }
    npm run build
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "Frontend build failed"; exit 1 }
Pop-Location
Write-Host "Frontend built OK." -ForegroundColor Green

# ── 3. Package ───────────────────────────────────────────────────────────────
Write-Host "[3/5] Packaging backend + frontend/dist..." -ForegroundColor Cyan
if (Test-Path $PACK) { Remove-Item $PACK -Force }

tar.exe -czf $PACK `
    --exclude="backend/venv" `
    --exclude="backend/__pycache__" `
    --exclude="backend/*.pyc" `
    --exclude="backend/learnmistschool.db" `
    backend `
    frontend/dist

if ($LASTEXITCODE -ne 0) { Write-Error "Packaging failed"; exit 1 }
if (-not (Test-Path $PACK)) { Write-Error "Package not created"; exit 1 }
Write-Host "Package created: $PACK" -ForegroundColor Green

# ── 4. Upload app + remote script ─────────────────────────────────────────────
Write-Host "[4/5] Uploading files to VM..." -ForegroundColor Cyan
gcloud compute scp $PACK "deploy_remote.sh" "${VM_NAME}:" --zone=$ZONE --project=$PROJECT_ID
if ($LASTEXITCODE -ne 0) { Write-Error "Upload failed"; exit 1 }
Write-Host "Upload complete." -ForegroundColor Green

# ── 5. Remote setup & restart ─────────────────────────────────────────────────
Write-Host "[5/5] Executing remote deployment..." -ForegroundColor Cyan
gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT_ID --command="chmod +x ~/deploy_remote.sh && bash ~/deploy_remote.sh"
if ($LASTEXITCODE -ne 0) { Write-Error "Remote deployment failed"; exit 1 }

# ── Print live URL ────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host " Deployment Complete!" -ForegroundColor Green
$ip = (gcloud compute instances list --filter="name=($VM_NAME)" --format="value(networkInterfaces[0].accessConfigs[0].natIP)" --project=$PROJECT_ID)
Write-Host " Live URL:  http://${ip}:8000" -ForegroundColor Yellow
Write-Host " API Docs:  http://${ip}:8000/docs" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Green
