#!/bin/bash
set -e

echo "=== [0] Stop Docker web container (keep Postgres) ==="
# Stop any Docker web/app containers that bind port 8000 to avoid traffic conflicts.
# The Postgres DB container is kept running so the backend can connect to it.
WEB_IDS=$(sudo docker ps -q --filter "publish=8000" --filter "publish=8080" 2>/dev/null || true)
if [ -n "$WEB_IDS" ]; then
    echo "    Stopping Docker containers on port 8000/8080: $WEB_IDS"
    sudo docker stop $WEB_IDS
else
    echo "    No conflicting Docker containers found on port 8000/8080"
fi

# Ensure the Postgres DB container is running (named app_db_1 or similar)
DB_ID=$(sudo docker ps -q --filter "ancestor=postgres:15" 2>/dev/null || true)
STOPPED_DB=$(sudo docker ps -aq --filter "ancestor=postgres:15" --filter "status=exited" 2>/dev/null || true)
if [ -z "$DB_ID" ] && [ -n "$STOPPED_DB" ]; then
    echo "    Restarting stopped Postgres container: $STOPPED_DB"
    sudo docker start $STOPPED_DB
    sleep 4
elif [ -n "$DB_ID" ]; then
    echo "    Postgres container already running: $DB_ID"
else
    echo "    WARNING: No Postgres container found — DB may need manual setup"
fi

echo "=== [1] Extracting new build ==="
rm -rf ~/app_new
mkdir ~/app_new
tar -xzf ~/deploy_pack.tar.gz -C ~/app_new

echo "=== [2] Syncing files into ~/app ==="
mkdir -p ~/app/backend

# Backend: rsync excluding .env and database (preserve those on server)
rsync -a --checksum --exclude=".env" --exclude="learnmistschool.db" ~/app_new/backend/ ~/app/backend/

# Frontend: force-replace entirely so stale files are never left behind
echo "    Replacing frontend/dist..."
rm -rf ~/app/frontend/dist
cp -a ~/app_new/frontend/dist ~/app/frontend/dist
echo "    Frontend dist replaced OK"

echo "=== [3] Installing Python dependencies ==="
cd ~/app/backend
if [ ! -d venv ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt -q

echo "=== [3b] Applying DB updates ==="
python scripts/apply_cloud_db_updates.py

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
sleep 4
sudo systemctl status learnmist.service --no-pager

# Quick health check — verify the live server is returning the new bundle
echo ""
echo "=== [5b] Health check ==="
SERVED=$(curl -s http://localhost:8000/ | grep -o 'index-[A-Za-z0-9_-]*\.js' | head -1)
echo "    Server is now serving: $SERVED"
if [ -z "$SERVED" ]; then
    echo "    WARNING: Could not detect JS bundle — check service logs"
fi

echo "=== [6] Cleanup ==="
rm -rf ~/app_new ~/deploy_pack.tar.gz ~/deploy_remote.sh

EXTERNAL_IP=$(curl -sf -H "Metadata-Flavor: Google" "http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/access-configs/0/external-ip" 2>/dev/null || echo "34.173.65.197")
echo ""
echo "================================================"
echo " Deployment Complete!"
echo " Live URL:  http://${EXTERNAL_IP}:8000"
echo " API Docs:  http://${EXTERNAL_IP}:8000/docs"
echo "================================================"
