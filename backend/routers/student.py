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


@router.get("/assignments/open", response_model=List[schemas.AssignmentOut])
def read_open_assignments(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_student)):
    # Find student record linked to user
    student = db.query(models.Student).filter(
        models.Student.name == current_user.username,
        models.Student.school_id == current_user.school_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    if not student.class_id:
         return [] 
         
    # Get assignments for the student's class that are PUBLISHED
    assignments = db.query(models.Assignment).filter(
        models.Assignment.class_id == student.class_id,
        models.Assignment.status == models.AssignmentStatus.PUBLISHED
    ).order_by(models.Assignment.due_date.desc()).all()

    # Filter out ones that are already submitted
    # Get all submission assignment_ids for this student
    submitted_ids = [s.assignment_id for s in db.query(models.Submission).filter(models.Submission.student_id == student.id).all()]
    
    open_assignments = []
    for a in assignments:
        if a.id not in submitted_ids:
            # Enrich with subject and teacher name
            # Assuming relationships exist: a.subject.name, a.teacher.username/name
            subject_name = a.subject.name if a.subject else "General"
            teacher_name = a.teacher.username if a.teacher else "Unknown"
            
            # Map to Schema
            # Pydantic models will strip extra fields if not in schema, so we need to ensure AssignmentOut has them.
            # We can create dicts and let Pydantic parse them.
            a_dict = {
                "id": a.id,
                "title": a.title,
                "description": a.description,
                "due_date": a.due_date,
                "status": a.status,
                "teacher_id": a.teacher_id,
                "class_id": a.class_id,
                "subject_id": a.subject_id,
                "subject_name": subject_name,
                "teacher_name": teacher_name,
                # "created_at": a.created_at # Model doesn't have created_at yet? Check models.py
            }
            open_assignments.append(a_dict)
            
    return open_assignments

@router.get("/assignments/completed", response_model=List[schemas.AssignmentOut])
def read_completed_assignments(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_student)):
    student = db.query(models.Student).filter(
        models.Student.name == current_user.username,
        models.Student.school_id == current_user.school_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    # Get submissions for this student
    # Join with Assignment to filter/sort
    results = db.query(models.Submission, models.Assignment).join(
        models.Assignment, models.Submission.assignment_id == models.Assignment.id
    ).filter(
        models.Submission.student_id == student.id
    ).order_by(models.Submission.submitted_at.desc()).all()
    
    completed_assignments = []
    for sub, a in results:
        subject_name = a.subject.name if a.subject else "General"
        teacher_name = a.teacher.username if a.teacher else "Unknown"
        
        a_dict = {
            "id": a.id,
            "title": a.title,
            "description": a.description,
            "due_date": a.due_date,
            "status": a.status,
            "teacher_id": a.teacher_id,
            "class_id": a.class_id,
            "subject_id": a.subject_id,
            "subject_name": subject_name,
            "teacher_name": teacher_name,
        }
        completed_assignments.append(a_dict)

    return completed_assignments

@router.get("/assignments/", response_model=List[schemas.Assignment])
def read_my_assignments(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_student)):
    # Legacy endpoint, keeping for now or redirecting logic
    # Find student record linked to user
    student = db.query(models.Student).filter(
        models.Student.name == current_user.username,
        models.Student.school_id == current_user.school_id
    ).first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
        
    if not student.class_id:
         return [] 
         
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
