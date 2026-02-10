from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from sqlalchemy.orm import Session
import database, models, schemas, auth
from routers import super_admin, school_admin, teacher, student, upload, auth_routes, ws_generation
from datetime import timedelta
from dotenv import load_dotenv
import os

load_dotenv()
import seed

models.Base.metadata.create_all(bind=database.engine)
try:
    seed.seed()
    print("Database seeded successfully.")
except Exception as e:
    print(f"Seeding failed: {e}")

app = FastAPI(
    title="LearnmistSchool API",
    description="Backend API for LearnmistSchool application managing Super Admin, School Admin, Teachers, and Students.",
    version="1.0.0",
    docs_url="/docs", # Default, but explicit is good
    redoc_url="/redoc"
)

# CORS Configuration
origins = [
    "http://localhost:5173", # Frontend
    "http://localhost:3000",
    "*" # Allow all for dev
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
from routers import individual
app.include_router(individual.router)

# Serve Frontend Static Files
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Determine frontend build path
relative_dist = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
docker_dist = "/app/frontend/dist" # Path inside Docker container

frontend_dist = None
if os.path.exists(relative_dist):
    frontend_dist = relative_dist
elif os.path.exists(docker_dist):
    frontend_dist = docker_dist

print(f"DEBUG: frontend_dist resolved to: {frontend_dist}")

if frontend_dist:
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

# Root Handler (Always registered to avoid 404)
@app.get("/")
async def serve_root():
    print("DEBUG: Handling root request")
    
    # Force check for index.html
    if frontend_dist:
        index_path = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_path):
            print(f"DEBUG: Serving index.html from {index_path}")
            return FileResponse(index_path)
        print(f"ERROR: index.html not found at {index_path}")
        return {"error": "index.html missing in dist", "path": index_path}
    
    # Fallback message that is NOT the confused user message
    return {"error": "Frontend build directory not found. Please check deployment.", "checked_paths": [relative_dist, docker_dist]}

# Catch-all (Always registered)
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    # Allow API routes to pass through
    if full_path.startswith("api") or full_path.startswith("docs") or full_path.startswith("redoc") or full_path.startswith("openapi.json"):
            raise HTTPException(status_code=404, detail="Not Found")
    
    if frontend_dist:
        return FileResponse(os.path.join(frontend_dist, "index.html"))
    return {"error": "Frontend build not found", "path": full_path}



@app.post("/token", response_model=schemas.Token, tags=["auth"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    print(f"LOGIN ATTEMPT: {form_data.username}")
    print(f"LOGIN ATTEMPT: {form_data.username}")
    # Allow login by username OR email
    user = db.query(models.User).filter(
        (models.User.username == form_data.username) | (models.User.email == form_data.username)
    ).first()
    
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role, "school_id": user.school_id}, expires_delta=access_token_expires
    )
    
    # Update last login
    from datetime import datetime
    user.last_login = datetime.utcnow()
    db.commit()
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "id": user.id
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

