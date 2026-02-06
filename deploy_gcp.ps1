param(
    [string]$ProjectId
)

$ErrorActionPreference = "Stop"

function Assert-Gcloud {
    # Check absolute path first if not in PATH
    if (Test-Path "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd") {
        $msg = "Found gcloud at standard location."
    } elseif (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
        Write-Error "Google Cloud SDK (gcloud) is not installed or not in PATH."
        exit 1
    }
}

Assert-Gcloud

# Use the absolute path if we found it, or rely on PATH
$gcloudCmd = "gcloud"
if (Test-Path "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd") {
    $gcloudCmd = "& 'C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'"
}

Write-Host "LearnmistSchool GCP Deployment Script" -ForegroundColor Green

if (-not $ProjectId) {
    $ProjectId = Read-Host "Enter your Google Cloud Project ID"
}

if (-not $ProjectId) {
    Write-Error "Project ID is required."
    exit 1
}

Write-Host "Setting project to $ProjectId..."
Invoke-Expression "$gcloudCmd config set project $ProjectId"

# Service enablement
Write-Host "Enabling required services (compute, sourcerepo)..."
# Invoke-Expression "$gcloudCmd services enable compute.googleapis.com sourcerepo.googleapis.com"
Write-Host "Skipping service enablement (User confirmed manual enablement)"

# 1. Source Repositories
# Write-Host "Skipping Cloud Source Repositories (Deprecated for new users)..."

# Git Push
# Write-Host "Skipping Git Push to Google..."

# 2. Compute Engine VM
Write-Host "Creating Compute Engine VM (e2-small)..."
$vmName = "learnmist-server"
$zone = "us-central1-a"

# Check if VM exists using list
$vmStatus = Invoke-Expression "$gcloudCmd compute instances list --filter='name=($vmName) AND zone:($zone)' --format='value(status)' --quiet"

if (-not $vmStatus) {
    Invoke-Expression "$gcloudCmd compute instances create $vmName --zone=$zone --machine-type=e2-small --image-family=cos-stable --image-project=cos-cloud --tags=http-server --quiet"
    Write-Host "VM Created."
} else {
    Write-Host "VM '$vmName' already exists."
}

# 3. Deploy Files
Write-Host "Compressing and uploading application files..."
# detailed exclusion for tar on windows might be tricky, let's try standard exclusion
# Remove old archive to ensure fresh build
if (Test-Path "app.tar.gz") { Remove-Item "app.tar.gz" }

# Include Dockerfile in the archive
tar --exclude="node_modules" --exclude="venv" --exclude=".git" --exclude="__pycache__" --exclude="*.pyc" -czf app.tar.gz backend frontend docker-compose.yml Dockerfile

if ($LASTEXITCODE -ne 0) {
    Write-Error "Tar packaging failed! Check if files are locked."
    exit 1
}

if (-not (Test-Path "app.tar.gz")) {
    Write-Error "app.tar.gz was not created."
    exit 1
}

# Check SSH readiness (loop a few times if new VM)
Write-Host "Uploading files (this may take a moment)..."
# Using explicit filename in target to avoid folder expansion issues
Invoke-Expression "$gcloudCmd compute scp app.tar.gz ${vmName}:app.tar.gz --zone=$zone --quiet"

# 4. Firewall
Write-Host "Ensuring HTTP firewall rule exists..."
try {
    Invoke-Expression "$gcloudCmd compute firewall-rules create allow-http --allow tcp:80 --target-tags http-server --quiet"
    Invoke-Expression "$gcloudCmd compute firewall-rules create allow-api --allow tcp:8000 --target-tags http-server --quiet"
} catch {
    Write-Host "Firewall rules likely already exist. Continuing..." -ForegroundColor Yellow
}

# 5. Remote Execution
Write-Host "Executing remote deployment..." -ForegroundColor Cyan

$remoteCommands = '
    # Stop existing containers using current dir context if possible, or force kill all (safest for full reset)
    # We try down first
    if [ -d "app" ]; then cd app && docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v $(pwd):$(pwd) -w=$(pwd) docker/compose:1.29.2 down || true && cd ..; fi &&
    
    # Wipe directory to ensure no stale files (like old docker-compose.yml)
    rm -rf app &&
    mkdir -p app && 
    tar -xzf app.tar.gz -C app && 
    cd app &&
    # Clean up any potential bad pycache
    find . -name "__pycache__" -type d -exec rm -rf {} + &&
    find . -name "*.pyc" -delete &&
    # Ensure .env exists or warn
    if [ ! -f backend/.env ]; then echo "WARNING: backend/.env not found!"; fi &&
    # Fix permissions if needed
    chmod +x backend/main.py || true &&
    # Docker Compose Up via Wrapper (required for COS)
    # We use docker/compose image because docker-compose binary is not on host
    # We use $(pwd) which generates the path on the Linux VM.
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v $(pwd):$(pwd) -w=$(pwd) docker/compose:1.29.2 down || true &&
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v $(pwd):$(pwd) -w=$(pwd) docker/compose:1.29.2 up -d --build --remove-orphans
'

# Use --command to run via SSH
# We use Try/Catch to handle potential SSH connection issues (e.g. key propagation delay)
try {
    # Initial attempt
    # Note: quoted "$remoteCommands" allows the string content to be passed as argument
    Invoke-Expression "$gcloudCmd compute ssh $vmName --zone=$zone --command=`"$remoteCommands`" --quiet"
} catch {
    Write-Warning "First SSH attempt failed (keys might be propagating). Retrying in 10 seconds..."
    Start-Sleep -Seconds 10
    Invoke-Expression "$gcloudCmd compute ssh $vmName --zone=$zone --command=`"$remoteCommands`" --quiet"
}

Write-Host "Deployment Triggered!" -ForegroundColor Green
Write-Host "External IP Verification:"
Invoke-Expression "$gcloudCmd compute instances list --filter='name=($vmName)' --format='value(networkInterfaces[0].accessConfigs[0].natIP)'"
