from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, models, schemas, auth

router = APIRouter(
    prefix="/school-admin",
    tags=["school-admin"],
    responses={404: {"description": "Not found"}},
)

def get_current_school_admin(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role not in [models.UserRole.SCHOOL_ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

@router.post("/teachers/", response_model=schemas.User)
def create_teacher(user: schemas.UserCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    # Create teacher for the *same* school as the admin
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="Admin must belong to a school")
        
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        hashed_password=hashed_password,
        role=models.UserRole.TEACHER,
        school_id=current_user.school_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/subjects/", response_model=schemas.Subject)
def create_subject(subject: schemas.SubjectCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    new_subject = models.Subject(
        name=subject.name,
        school_id=current_user.school_id
    )
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject

@router.post("/grades/", response_model=schemas.Grade)
def create_grade(grade: schemas.GradeCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    new_grade = models.Grade(
        name=grade.name,
        school_id=current_user.school_id
    )
    db.add(new_grade)
    db.commit()
    db.refresh(new_grade)
    return new_grade

@router.post("/assignments/")
def assign_teacher(teacher_id: int, subject_id: int, grade_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    # Verify all belong to the same school
    teacher = db.query(models.User).filter(models.User.id == teacher_id, models.User.school_id == current_user.school_id, models.User.role == models.UserRole.TEACHER).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found in this school")
        
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id, models.Subject.school_id == current_user.school_id).first()
    if not subject:
         raise HTTPException(status_code=404, detail="Subject not found in this school")

    grade = db.query(models.Grade).filter(models.Grade.id == grade_id, models.Grade.school_id == current_user.school_id).first()
    if not grade:
         raise HTTPException(status_code=404, detail="Grade not found in this school")

    assignment = models.TeacherAssignment(
        teacher_id=teacher_id,
        subject_id=subject_id,
        grade_id=grade_id
    )
    db.add(assignment)
    db.commit()
    return {"message": "Assignment created successfully"}
