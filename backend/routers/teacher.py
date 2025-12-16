from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import database, models, schemas, auth

router = APIRouter(
    prefix="/teacher",
    tags=["teacher"],
    responses={404: {"description": "Not found"}},
)

def get_current_teacher(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role not in [models.UserRole.TEACHER, models.UserRole.SCHOOL_ADMIN, models.UserRole.SUPER_ADMIN]:
         raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

class StudentCreateSchema(schemas.BaseModel):
    name: str
    grade_id: int

@router.post("/students/", response_model=schemas.Student)
def create_student(student: StudentCreateSchema, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # Verify grade exists and belongs to the same school
    grade = db.query(models.Grade).filter(models.Grade.id == student.grade_id, models.Grade.school_id == current_user.school_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found in this school")
        
    new_student = models.Student(
        name=student.name,
        grade_id=student.grade_id,
        school_id=current_user.school_id
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student

@router.get("/students/", response_model=List[schemas.Student])
def read_students(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # Return all students in the teacher's school (simple implementation)
    # Real world might want to filter by students assigned to this teacher
    students = db.query(models.Student).filter(models.Student.school_id == current_user.school_id).all()
    return students
