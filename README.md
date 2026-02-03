# LearnmistSchool - Docker Deployment Guide

This repository contains the full source code for LearnmistSchool (Backend + Frontend).

## 🚀 Quick Start (Recommended)

The easiest way to run the application is using **Docker Compose**. This method automatically handles building the image, managing ports, and importantly, **persisting your database**.

### 1. Start the Application
Run this command in your terminal:
```bash
docker compose up --build
```
*   `--build`: Rebuilds the image (use this if you changed code).
*   **Database**: Your data is automatically saved to `./backend/learnmistschool.db`.

### 2. Access the App
*   **Application**: [http://localhost:8000](http://localhost:8000)
*   **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Stop the App
Press `Ctrl+C` in your terminal.
To remove the containers (safe to do, data is saved):
```bash
docker compose down
```

---

## 🛠 Manual Method (Docker CLI)

If you prefer running manual Docker commands or are deploying to a specific server without Compose:

### 1. Build the Image
```bash
docker build -t learnmistschool .
```

### 2. Run the Container
**Critical**: You MUST use the `-v` flag to save your database.
```bash
docker run -p 8000:8000 --name learnmistschool_app -v "c:\Users\solan\OneDrive\Desktop\FinalLMS\LearnmistSchool\backend\learnmistschool.db:/app/learnmistschool.db" learnmistschool
```

### 3. Update/Restart
If you need to restart or update the container, you must remove the old one first:
```bash
docker rm -f learnmistschool_app
# Then run the 'docker run' command above again
```

---

## ⚠️ Troubleshooting & Notes

### Database Persistence
*   **Issue**: "I logged in yesterday but my account is gone."
*   **Fix**: You likely forgot the volume mount (`-v`) or didn't use `docker compose`. Ensure you are mapping the local `.db` file to `/app/learnmistschool.db` inside the container.

### Port Conflicts
*   **Issue**: `Bind for 0.0.0.0:8000 failed: port is already allocated`
*   **Fix**: Stop other containers using port 8000, or run on a different port (e.g., 8080):
    ```bash
    docker run -p 8080:8000 ...
    ```

### Production Deployment (GCP/AWS)
*   **Option A (VM)**: SSH into your VM, change directory to this folder, and run the **Quick Start** commands.
*   **Option B (Cloud Run)**: Deploy the image and ensure you mount a **persistent volume** (GCS Bucket or Cloud Storage) to `/app`. **Do not** use Cloud Run without a volume or you will lose data on every scale-down.
