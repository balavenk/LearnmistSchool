$ErrorActionPreference = "Stop"
$ProjectId = "project-7b2578b2-0b43-448e-80c"
$Zone = "us-central1-a"
$InstanceName = "learnmist-qa"
$IpName = "learnmist-qa-static-ip"
$MachineType = "e2-small"
$ImageFamily = "cos-stable"
$ImageProject = "cos-cloud"

# 1. Create Static IP
Write-Host "Creating Static IP '$IpName'..." -ForegroundColor Cyan
try {
    gcloud compute addresses create $IpName --region=us-central1
    Write-Host "Static IP created." -ForegroundColor Green
} catch {
    Write-Host "Static IP likely exists. Continuing..." -ForegroundColor Yellow
}

$GlobalIp = gcloud compute addresses describe $IpName --region=us-central1 --format="value(address)"
Write-Host "Target IP Address: $GlobalIp" -ForegroundColor Magenta

# 2. Create VM
Write-Host "Creating/Updating VM '$InstanceName'..." -ForegroundColor Cyan
# Check if exists
$vmExists = gcloud compute instances list --filter="name=$InstanceName" --format="value(name)"
if ($vmExists) {
    Write-Host "VM '$InstanceName' already exists. Skipping creation." -ForegroundColor Yellow
} else {
    gcloud compute instances create $InstanceName `
        --zone=$Zone `
        --machine-type=$MachineType `
        --image-family=$ImageFamily `
        --image-project=$ImageProject `
        --address=$GlobalIp `
        --tags=http-server,https-server,qa-server
    Write-Host "VM Created successfully." -ForegroundColor Green
}

# 3. Firewall Rules
Write-Host "Ensuring Firewall Rules..." -ForegroundColor Cyan
try {
    # Allow 80 and 8000 for QA
    gcloud compute firewall-rules create allow-qa-http --allow tcp:80,tcp:8000 --target-tags qa-server --quiet
} catch {
    Write-Host "Firewall rule likely exists." -ForegroundColor Yellow
}

Write-Host "Infrastructure Ready. VM: $InstanceName | IP: $GlobalIp" -ForegroundColor Green
return $GlobalIp
