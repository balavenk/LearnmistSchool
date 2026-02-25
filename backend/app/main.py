from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os
import logging

load_dotenv()

from sqlalchemy.orm import Session
from sqlalchemy import func
from . import database, models, schemas, auth
from .routers import super_admin, school_admin, teacher, student, upload, auth_routes, ws_generation, individual
from datetime import timedelta

logger = logging.getLogger(__name__)

# Create tables (Moved to startup event or handle via Alembic)
# models.Base.metadata.create_all(bind=database.engine)

# Seed database (optional - comment out if not needed)
# try:
#     import sys
#     sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
#     from scripts import seed
#     seed.seed()
#     print("Database seeded successfully.")
# except Exception as e:
#     print(f"Seeding failed: {e}")

app = FastAPI(
    title="LearnmistSchool API",
    description="Backend API for LearnmistSchool application managing Super Admin, School Admin, Teachers, and Students.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(super_admin.router)
app.include_router(school_admin.router)
app.include_router(teacher.router)
app.include_router(student.router)
app.include_router(upload.router)
app.include_router(auth_routes.router)
app.include_router(ws_generation.router)
app.include_router(individual.router)

# Serve Frontend Static Files
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Determine frontend build path (adjust for new location in app/)
relative_dist = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
docker_dist = "/app/frontend/dist"  # Path inside Docker container

frontend_dist = None
if os.path.exists(relative_dist):
    frontend_dist = relative_dist
elif os.path.exists(docker_dist):
    frontend_dist = docker_dist

print(f"DEBUG: frontend_dist resolved to: {frontend_dist}")

if frontend_dist:
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

# Root Handler
@app.get("/")
async def serve_root():
    # Force check for index.html
    if frontend_dist:
        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        logger.error(f"index.html not found at {index_path}")
        return {"error": "index.html missing", "path": index_path}
    return {"error": "Frontend build not found"}

# Root Handler
@app.get("/")
async def serve_root():
    if frontend_dist:
        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        logger.error(f"index.html not found: {index_path}")
    return {"error": "Frontend build not found"}

# SPA Support: Handle unknown routes by serving index.html
# This avoids intercepting WebSocket handshakes which are technically GET requests
from starlette.exceptions import HTTPException as StarletteHTTPException

@app.exception_handler(StarletteHTTPException)
async def spa_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        full_path = request.url.path.lstrip("/")
        
        # API and System Prefixes that should TRULY 404
        api_prefixes = ["api/", "docs", "redoc", "openapi.json", "super-admin/", "school-admin/", "teacher/", "student/", "upload/", "auth/", "ws/", "individual/"]
        
        if any(full_path.startswith(prefix) for prefix in api_prefixes):
            logger.debug(f"True 404 for API path: {full_path}")
            return Response(status_code=404, content="Not Found")
        
        # Check if it's a websocket upgrade (although Starlette usually handles this before 404)
        if request.headers.get("upgrade") == "websocket":
            logger.debug(f"Catching potential WS upgrade in 404 handler for {full_path}")
            # If we reached here, it means no WS route matched either.
            return Response(status_code=404, content="WebSocket Route Not Found")

        # Serve frontend for UI routes
        if frontend_dist:
            index_path = os.path.join(frontend_dist, "index.html")
            if os.path.exists(index_path):
                return FileResponse(index_path)
    
    # Fallback to default handler for other errors or if index.html missing
    from fastapi.exception_handlers import http_exception_handler
    return await http_exception_handler(request, exc)



@app.post("/token", response_model=schemas.Token, tags=["auth"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    logger.info(f"Login attempt for user: {form_data.username}")
    # Allow login by username OR email
    username_or_email = form_data.username.strip().lower()
    user = db.query(models.User).filter(
        (func.lower(models.User.username) == username_or_email) | (func.lower(models.User.email) == username_or_email)
    ).first()
    
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inactive user",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role, "school_id": user.school_id}, expires_delta=access_token_expires
    )
    school_name = None
    if user.school_id:
        school = db.query(models.School).filter(models.School.id == user.school_id).first()
        if school:
            school_name = school.name
    
    # Update last login
    from datetime import datetime
    user.last_login = datetime.utcnow()
    db.commit()
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "id": user.id,
        "school_name": school_name
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

