from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import database, models, schemas, auth

router = APIRouter(
    prefix="/school-admin",
    tags=["school-admin"],
    responses={404: {"description": "Not found"}},
)

def get_current_school_admin(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role not in [models.UserRole.SCHOOL_ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

import mock_data

@router.post("/teachers/", response_model=schemas.User)
def create_teacher(user: schemas.UserCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="Admin must belong to a school")
        
    if any(u.username == user.username for u in mock_data.USERS):
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        id=mock_data.get_next_id(mock_data.USERS),
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role=models.UserRole.TEACHER,
        school_id=current_user.school_id,
        active=True
    )
    mock_data.USERS.append(new_user)
    return new_user

@router.get("/teachers/", response_model=List[schemas.User])
def read_teachers(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    return [u for u in mock_data.USERS if u.school_id == current_user.school_id and u.role == models.UserRole.TEACHER]

@router.post("/classes/", response_model=schemas.Class)
def create_class(class_data: schemas.ClassCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    # Verify grade belongs to school
    grade = next((g for g in mock_data.GRADES if g.id == class_data.grade_id and g.school_id == current_user.school_id), None)
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found in this school")
    
    # Verify teacher if provided
    if class_data.class_teacher_id:
        teacher = next((t for t in mock_data.USERS if t.id == class_data.class_teacher_id and t.school_id == current_user.school_id and t.role == models.UserRole.TEACHER), None)
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found in this school")

    new_class = models.Class(
        id=mock_data.get_next_id(mock_data.CLASSES),
        name=class_data.name,
        section=class_data.section,
        grade_id=class_data.grade_id,
        school_id=current_user.school_id,
        class_teacher_id=class_data.class_teacher_id
    )
    mock_data.CLASSES.append(new_class)
    return new_class

@router.get("/classes/", response_model=List[schemas.Class])
def read_classes(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    return [c for c in mock_data.CLASSES if c.school_id == current_user.school_id]

@router.post("/subjects/", response_model=schemas.Subject)
def create_subject(subject: schemas.SubjectCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    new_subject = models.Subject(
        id=mock_data.get_next_id(mock_data.SUBJECTS),
        name=subject.name,
        school_id=current_user.school_id
    )
    mock_data.SUBJECTS.append(new_subject)
    return new_subject

@router.get("/subjects/", response_model=List[schemas.Subject])
def read_subjects(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    return [s for s in mock_data.SUBJECTS if s.school_id == current_user.school_id]

@router.post("/grades/", response_model=schemas.Grade)
def create_grade(grade: schemas.GradeCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    new_grade = models.Grade(
        id=mock_data.get_next_id(mock_data.GRADES),
        name=grade.name,
        school_id=current_user.school_id
    )
    mock_data.GRADES.append(new_grade)
    return new_grade

@router.get("/grades/", response_model=List[schemas.Grade])
def read_grades(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    return [g for g in mock_data.GRADES if g.school_id == current_user.school_id]

@router.put("/classes/{class_id}/teacher/{teacher_id}")
def assign_class_teacher(class_id: int, teacher_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    # Verify class exists and belongs to school
    class_obj = next((c for c in mock_data.CLASSES if c.id == class_id and c.school_id == current_user.school_id), None)
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found in this school")
    
    # Verify teacher exists and belongs to school
    teacher = next((t for t in mock_data.USERS if t.id == teacher_id and t.school_id == current_user.school_id and t.role == models.UserRole.TEACHER), None)
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found in this school")
        
    class_obj.class_teacher_id = teacher_id
    return {"message": "Teacher assigned to class successfully"}
