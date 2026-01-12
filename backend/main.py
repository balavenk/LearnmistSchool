from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import database, models, schemas, auth
from routers import super_admin, school_admin, teacher, student, materials
from datetime import timedelta

# models.Base.metadata.create_all(bind=database.engine)

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
app.include_router(materials.router)


@app.post("/token", response_model=schemas.Token, tags=["auth"])
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
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
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "username": user.username
    }

@app.get("/", tags=["general"])
def read_root():
    return {"message": "LearnmistSchool API is running. Visit /docs for Swagger UI."}
