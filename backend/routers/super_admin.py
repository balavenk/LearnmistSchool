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

import mock_data

@router.post("/schools/", response_model=schemas.School)
def create_school(school: schemas.SchoolCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    # Check if exists in mock data
    if any(s.name == school.name for s in mock_data.SCHOOLS):
        raise HTTPException(status_code=400, detail="School with this name already exists")
        
    new_school = models.School(
        id=mock_data.get_next_id(mock_data.SCHOOLS),
        name=school.name,
        address=school.address,
        max_teachers=school.max_teachers,
        max_students=school.max_students,
        max_classes=school.max_classes,
        active=True
    )
    mock_data.SCHOOLS.append(new_school)
    return new_school

@router.get("/schools/", response_model=List[schemas.School])
def read_schools(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    return mock_data.SCHOOLS[skip : skip + limit]

@router.post("/schools/{school_id}/admin", response_model=schemas.User)
def create_school_admin(school_id: int, user: schemas.UserCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_super_admin)):
    # Verify school exists
    school = next((s for s in mock_data.SCHOOLS if s.id == school_id), None)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    
    # Verify user unique
    if any(u.username == user.username for u in mock_data.USERS):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        id=mock_data.get_next_id(mock_data.USERS),
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role=models.UserRole.SCHOOL_ADMIN,
        school_id=school_id,
        active=True
    )
    mock_data.USERS.append(new_user)
    return new_user
