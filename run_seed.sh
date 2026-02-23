#!/bin/bash
set -e
cd ~/app/backend
source venv/bin/activate
echo "=== Running seed script ==="
python Intial_seed_data.py
echo "=== Seed complete ==="
