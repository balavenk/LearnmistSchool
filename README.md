# Learnmist School Management System

This is a full-stack application for managing a school system, featuring portals for Super Admins, School Admins, Teachers, and Students.

## Architecture

- **Frontend**: React (Vite) + Tailwind CSS
- **Backend**: Python (FastAPI) + SQLAlchemy (PostgreSQL + pgvector)
- **Database**: PostgreSQL (Running in Docker)

## Prerequisites

- Node.js (v18+)
- Python (v3.9+)
- Docker & Docker Compose

## Setup & Installation

### 1. Database Setup (Docker)

Start the PostgreSQL database with pgvector support:

```powershell
docker compose up db -d
```
*Note: The database runs on port 5435 to avoid conflicts with local PostgreSQL installations.*

### 2. Backend Setup

```powershell
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies (including psycopg2 and pgvector)
pip install -r requirements.txt

# Seed the Database (Creates initial users and school data)
python seed.py
```

**Environment Variables**:
The project comes with a `.env` file configured for the Docker database.
`DATABASE_URL=postgresql+psycopg2://user:password@127.0.0.1:5435/learnmistschool`

### 3. Frontend Setup

```powershell
cd frontend

# Install dependencies
npm install
```

**Environment Variables**:
The project comes with a `.env` file pointing to the local backend.
`VITE_API_URL=http://localhost:8000`

## Running the Application

You need to run the backend and frontend in separate terminal windows.

### Terminal 1: Backend

```powershell
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload
```
*Server runs at: http://localhost:8000*
*API Docs: http://localhost:8000/docs*

### Terminal 2: Frontend

```powershell
cd frontend
npm run dev
```
*App runs at: http://localhost:5173*

## Login Credentials

The seed script creates the following default users (Password: `password123`):

- **Super Admin**: `superadmin`
- **School Admin**: `schooladmin`
- **Teacher**: `teacher1`
- **Student**: `student1`
