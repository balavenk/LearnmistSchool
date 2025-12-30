from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import database, models, schemas, auth

router = APIRouter(
    prefix="/super-admin",
    tags=["super-admin"],
    responses={404: {"description": "Not found"}},
)

# Dependency to check if user is SUPER_ADMIN
def get_current_super_admin(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role != models.UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


@router.post("/schools/", response_model=schemas.School)
def create_school(school: schemas.SchoolCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    # Check if exists in DB
    existing_school = db.query(models.School).filter(models.School.name == school.name).first()
    if existing_school:
        raise HTTPException(status_code=400, detail="School with this name already exists")
        
    new_school = models.School(
        name=school.name,
        address=school.address,
        max_teachers=school.max_teachers,
        max_students=school.max_students,
        max_classes=school.max_classes,
        active=True
    )
    db.add(new_school)
    db.commit()
    db.refresh(new_school)
    return new_school

@router.get("/schools/", response_model=List[schemas.School])
def read_schools(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    return db.query(models.School).offset(skip).limit(limit).all()

@router.post("/schools/{school_id}/admin", response_model=schemas.User)
def create_school_admin(school_id: int, user: schemas.UserCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    # Verify school exists
    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Verify user unique
    existing_user = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role=models.UserRole.SCHOOL_ADMIN,
        school_id=school_id,
        active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
