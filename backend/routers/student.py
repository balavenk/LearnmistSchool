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

import mock_data

@router.get("/assignments/", response_model=List[schemas.Assignment])
def read_my_assignments(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_student)):
    # Find student record linked to user
    student = next((s for s in mock_data.STUDENTS_PROFILES if s.name == current_user.username and s.school_id == current_user.school_id), None)
    
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    if not student.class_id:
         return [] # No class, no assignments
         
    # Get assignments for the student's class
    return [a for a in mock_data.ASSIGNMENTS if a.class_id == student.class_id and a.status == models.AssignmentStatus.PUBLISHED]

@router.post("/submissions/", response_model=schemas.Submission)
def create_submission(submission: schemas.SubmissionCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_student)):
    student = next((s for s in mock_data.STUDENTS_PROFILES if s.name == current_user.username and s.school_id == current_user.school_id), None)
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    # Check if assignment exists
    assignment = next((a for a in mock_data.ASSIGNMENTS if a.id == submission.assignment_id), None)
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    new_submission = models.Submission(
        id=mock_data.get_next_id(mock_data.SUBMISSIONS),
        assignment_id=submission.assignment_id,
        student_id=student.id,
        status=models.SubmissionStatus.SUBMITTED,
        submitted_at=datetime.now()
    )
    mock_data.SUBMISSIONS.append(new_submission)
    return new_submission

@router.get("/submissions/", response_model=List[schemas.Submission])
def read_submissions(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_student)):
    # Return all submissions for the current student
    student = next((s for s in mock_data.STUDENTS_PROFILES if s.name == current_user.username and s.school_id == current_user.school_id), None)
    if not student:
        return []
        
    return [s for s in mock_data.SUBMISSIONS if s.student_id == student.id]
