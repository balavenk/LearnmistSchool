#!/bin/bash
set -e

echo "=== [1] Extracting new build ==="
rm -rf ~/app_new
mkdir ~/app_new
tar -xzf ~/deploy_pack.tar.gz -C ~/app_new

echo "=== [2] Syncing files into ~/app ==="
mkdir -p ~/app/backend ~/app/frontend/dist

rsync -a --exclude=".env" --exclude="learnmistschool.db" ~/app_new/backend/ ~/app/backend/
rsync -a ~/app_new/frontend/dist/ ~/app/frontend/dist/

echo "=== [3] Installing Python dependencies ==="
cd ~/app/backend
if [ ! -d venv ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q

echo "=== [4] Writing Systemd service file ==="
USER_HOME=$(eval echo ~$USER)
USERNAME=$(whoami)

sudo bash -c "cat > /etc/systemd/system/learnmist.service" << SVCEOF
[Unit]
Description=LearnmistSchool FastAPI App
After=network.target

[Service]
User=${USERNAME}
WorkingDirectory=${USER_HOME}/app/backend
ExecStart=${USER_HOME}/app/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
Environment=PATH=${USER_HOME}/app/backend/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

[Install]
WantedBy=multi-user.target
SVCEOF

sudo systemctl daemon-reload
sudo systemctl enable learnmist.service

echo "=== [5] Restarting learnmist.service ==="
sudo systemctl restart learnmist.service
sleep 3
sudo systemctl status learnmist.service --no-pager

echo "=== [6] Cleanup ==="
rm -rf ~/app_new ~/deploy_pack.tar.gz ~/deploy_remote.sh

EXTERNAL_IP=$(curl -sf -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip" 2>/dev/null || echo "34.173.65.197")
echo ""
echo "================================================"
echo " Deployment Complete!"
echo " Live URL:  http://${EXTERNAL_IP}:8000"
echo " API Docs:  http://${EXTERNAL_IP}:8000/docs"
echo "================================================"
