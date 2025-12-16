from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, models, schemas, auth

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
    db_school = db.query(models.School).filter(models.School.name == school.name).first()
    if db_school:
        raise HTTPException(status_code=400, detail="School with this name already exists")
    new_school = models.School(
        name=school.name,
        max_teachers=school.max_teachers,
        max_students=school.max_students
    )
    db.add(new_school)
    db.commit()
    db.refresh(new_school)
    return new_school

@router.get("/schools/", response_model=List[schemas.School])
def read_schools(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    schools = db.query(models.School).offset(skip).limit(limit).all()
    return schools

@router.post("/schools/{school_id}/admin", response_model=schemas.User)
def create_school_admin(school_id: int, user: schemas.UserCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    db_school = db.query(models.School).filter(models.School.id == school_id).first()
    if not db_school:
        raise HTTPException(status_code=404, detail="School not found")
    
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        hashed_password=hashed_password,
        role=models.UserRole.SCHOOL_ADMIN,
        school_id=school_id # Assign to the school
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
