from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import database, models, schemas
from auth import get_current_active_user

router = APIRouter(
    prefix="/assignments",
    tags=["assignments"]
)

@router.post("/", response_model=schemas.Assignment)
def create_assignment(
    assignment: schemas.AssignmentCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # Ensure quiz exists if provided
    if assignment.quiz_id:
        quiz = db.query(models.Quiz).filter(models.Quiz.id == assignment.quiz_id).first()
        if not quiz:
            raise HTTPException(status_code=404, detail="Quiz not found")

    new_assignment = models.Assignment(
        title=assignment.title,
        description=assignment.description,
        due_date=assignment.due_date,
        status=assignment.status,
        teacher_id=current_user.id,
        class_id=assignment.assigned_to_class_id,
        subject_id=assignment.subject_id,
        quiz_id=assignment.quiz_id
    )
    
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment

@router.get("/", response_model=List[schemas.Assignment])
def get_assignments(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_active_user)
):
    # If teacher, return created assignments
    if current_user.role in [models.UserRole.TEACHER, models.UserRole.SCHOOL_ADMIN, models.UserRole.SUPER_ADMIN]:
        return db.query(models.Assignment).filter(models.Assignment.teacher_id == current_user.id).all()
    
    # If student, link via Student -> Class -> Assignment
    # This logic requires knowing the student's class, which might be in current_user.school or separate student table linkage
    # For MVP, let's just return empty or catch basic student case if we had student logic
    return []
