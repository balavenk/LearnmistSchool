$ErrorActionPreference = "Stop"

$PROJECT_ID  = "project-7b2578b2-0b43-448e-80c"
$VM_NAME     = "learnmist-server"
$ZONE        = "us-central1-a"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$imageName = "${VM_NAME}-backup-${timestamp}"

Write-Host ""
Write-Host "================================================" -ForegroundColor Yellow
Write-Host "  Creating Machine Image Backup" -ForegroundColor Yellow
Write-Host "  VM: $VM_NAME" -ForegroundColor Yellow
Write-Host "  Image: $imageName" -ForegroundColor Yellow
Write-Host "================================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "Running gcloud compute machine-images create..." -ForegroundColor Cyan

gcloud compute machine-images create $imageName `
    --source-instance=$VM_NAME `
    --source-instance-zone=$ZONE `
    --project=$PROJECT_ID

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "    OK: Successfully created machine image $imageName" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "    FAIL: Failed to create machine image" -ForegroundColor Red
    exit 1
}

-- learnmist-server-backup-20260314 name of the vm image created on 3/14/2026
