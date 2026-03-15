$ErrorActionPreference = "Stop"
$vmName = "learnmist-server"
$zone = "us-central1-a"
$gcloudCmd = "gcloud"
if (Test-Path "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd") {
    $gcloudCmd = "& 'C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd'"
}

$remoteCommands = '
    cd app &&
    # Stop existing
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v "`$PWD:`$PWD" -w="`$PWD" docker/compose:1.29.2 down --remove-orphans || true &&
    # Start new
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock -v "`$PWD:`$PWD" -w="`$PWD" docker/compose:1.29.2 up -d --build --remove-orphans
'

Invoke-Expression "$gcloudCmd compute ssh $vmName --zone=$zone --command=`"$remoteCommands`" --quiet"
