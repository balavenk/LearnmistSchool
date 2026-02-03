# Stage 1: Build the Frontend
FROM node:20-alpine as frontend-build

WORKDIR /app/frontend

# Copy package files first for caching
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY frontend/ ./

# Build the React application
RUN npm run build

# Stage 2: Build the Backend and Serve
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for psycopg2, if using postgres later)
# RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ .

# Create the static directory (just in case)
RUN mkdir -p static

# Copy built frontend assets from Stage 1
COPY --from=frontend-build /app/frontend/dist ./static

# Set environment variables
# Ensure Python output is sent straight to terminal (e.g. when running in container)
ENV PYTHONUNBUFFERED=1

# Expose the port (Cloud Run defaults to PORT env var, typically 8080)
EXPOSE 8000

# Run the application
# We use shell form to allow variable expansion for $PORT
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
