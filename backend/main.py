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

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(
    title="LearnmistSchool API",
    description="Backend API for LearnmistSchool application managing Super Admin, School Admin, Teachers, and Students.",
    version="1.0.0",
    docs_url="/docs", # Default, but explicit is good
    redoc_url="/redoc"
)

@app.on_event("startup")
async def startup_event():
    print("--- REGISTERED ROUTES ---")
    for route in app.routes:
        print(f"{route.path} ({getattr(route, 'methods', 'WS')})")
    print("-------------------------")

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


@app.post("/token", response_model=schemas.Token, tags=["auth"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    print(f"LOGIN ATTEMPT: {form_data.username}")
    user = db.query(models.User).filter(models.User.username == form_data.username).first()
    # user = next((u for u in mock_data.USERS if u.username == form_data.username), None)

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


from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

# Mount static files (assets, css, js) - These are usually in /static/assets
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")

@app.exception_handler(404)
async def custom_404_handler(request, __):
    """
    Serve the React app for any path not matched by the API (SPA routing).
    Only serve index.html if the request accepts HTML.
    """
    path = request.url.path
    if path.startswith("/api") or path.startswith("/ws"):
        return JSONResponse({"detail": "Not Found"}, status_code=404)
        
    # Check if a file exists in static (e.g. favicon.ico)
    # Note: request.url.path includes leading /
    file_path = f"static{path}"
    if os.path.exists(file_path) and os.path.isfile(file_path):
        return FileResponse(file_path)
        
    # Fallback to index.html for SPA
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
        
    return {"message": "LearnmistSchool API is running. Frontend not found (dev mode)."}

