# Stage 1: Build Frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npx vite build

# Stage 2: Backend & Final Image
FROM python:3.11-slim

WORKDIR /app/backend
ENV PYTHONUNBUFFERED=1

# Install system dependencies if needed (e.g. for some python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Default to SQLite for container
ENV DATABASE_URL=sqlite:///./learnmistschool.db

# Expose port
EXPOSE 8000

# Run command (Use PORT env var for Cloud Run support)
# Run command (Use PORT env var for Cloud Run support)
CMD uvicorn main:app --host 0.0.0.0 --port 8080
