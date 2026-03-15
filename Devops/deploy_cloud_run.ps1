param(
    [string]$ProjectId,
    [string]$Region = "us-central1",
    [string]$ServiceName = "learnmist-school"
)

$ErrorActionPreference = "Stop"

# 1. Check gcloud
if (-not (Get-Command gcloud -ErrorAction SilentlyContinue)) {
    Write-Error "Google Cloud SDK (gcloud) is not installed."
    exit 1
}

# 2. Get/Set Project ID
if (-not $ProjectId) {
    $current = gcloud config get-value project
    if ($current -and $current -ne "(unset)") {
        $UseCurrent = Read-Host "Use current project '$current'? (Y/n)"
        if ($UseCurrent -eq "" -or $UseCurrent -match "^[Yy]") {
            $ProjectId = $current
        }
    }
}

if (-not $ProjectId) {
    $ProjectId = Read-Host "Enter your Google Cloud Project ID"
}

if (-not $ProjectId) {
    Write-Error "Project ID is required."
    exit 1
}

Write-Host "Using Project: $ProjectId" -ForegroundColor Cyan
gcloud config set project $ProjectId

# 3. Enable APIs
Write-Host "Enabling Cloud Run and Cloud Build APIs..." -ForegroundColor Yellow
gcloud services enable run.googleapis.com cloudbuild.googleapis.com
if ($LASTEXITCODE -ne 0) { Write-Error "Failed to enable APIs."; exit 1 }

# 4. Deploy from Source (handles build + artifact registry automatically)
Write-Host "Deploying to Cloud Run from source..." -ForegroundColor Cyan

gcloud run deploy $ServiceName `
    --source . `
    --platform managed `
    --region $Region `
    --allow-unauthenticated `
    --quiet

if ($LASTEXITCODE -ne 0) { 
    Write-Error "Deployment failed." 
} else {
    Write-Host "Deployment Successful!" -ForegroundColor Green
    Write-Host "Access your app at the URL provided above."
}
