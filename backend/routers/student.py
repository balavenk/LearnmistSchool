from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import database, models, schemas, auth

router = APIRouter(
    prefix="/student",
    tags=["student"],
    responses={404: {"description": "Not found"}},
)

def get_current_student(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role != models.UserRole.STUDENT:
         raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


@router.get("/assignments/", response_model=List[schemas.Assignment])
def read_my_assignments(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_student)):
    # Find student record linked to user
    student = db.query(models.Student).filter(
        models.Student.name == current_user.username,
        models.Student.school_id == current_user.school_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    if not student.class_id:
         return [] # No class, no assignments
         
    # Get assignments for the student's class
    return db.query(models.Assignment).filter(
        models.Assignment.class_id == student.class_id,
        models.Assignment.status == models.AssignmentStatus.PUBLISHED
    ).all()

@router.post("/submissions/", response_model=schemas.Submission)
def create_submission(submission: schemas.SubmissionCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_student)):
    student = db.query(models.Student).filter(
        models.Student.name == current_user.username,
        models.Student.school_id == current_user.school_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    # Check if assignment exists
    assignment = db.query(models.Assignment).filter(models.Assignment.id == submission.assignment_id).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    new_submission = models.Submission(
        assignment_id=submission.assignment_id,
        student_id=student.id,
        status=models.SubmissionStatus.SUBMITTED,
        submitted_at=datetime.now()
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)
    return new_submission

@router.get("/submissions/", response_model=List[schemas.Submission])
def read_submissions(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_student)):
    # Return all submissions for the current student
    student = db.query(models.Student).filter(
        models.Student.name == current_user.username,
        models.Student.school_id == current_user.school_id
    ).first()
    if not student:
        return []
        
    return db.query(models.Submission).filter(models.Submission.student_id == student.id).all()
