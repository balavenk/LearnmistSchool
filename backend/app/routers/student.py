from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from .. import database, models, schemas, auth

router = APIRouter(
    prefix="/student",
    tags=["student"],
    responses={404: {"description": "Not found"}},
)

def get_current_student(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role != models.UserRole.STUDENT:
         raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

def get_current_student_profile(
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_student)
):
    # Priority: Link via user_id
    student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
    
    if not student:
        # Fallback: Link via name matching (Legacy)
        student = db.query(models.Student).filter(
            models.Student.name == current_user.username,
            models.Student.school_id == current_user.school_id
        ).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")
    return student

@router.get("/assignments/open", response_model=List[schemas.AssignmentOut])
def read_open_assignments(db: Session = Depends(database.get_db), student: models.Student = Depends(get_current_student_profile)):
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
            open_assignments.append(a_dict)
            
    return open_assignments

@router.get("/assignments/completed", response_model=List[schemas.AssignmentOut])
def read_completed_assignments(db: Session = Depends(database.get_db), student: models.Student = Depends(get_current_student_profile)):
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
            "submission_id": sub.id
        }
        completed_assignments.append(a_dict)

    return completed_assignments

@router.get("/assignments/", response_model=List[schemas.Assignment])
def read_my_assignments(db: Session = Depends(database.get_db), student: models.Student = Depends(get_current_student_profile)):
    if not student.class_id:
         return [] 
         
    # Get assignments for the student's class
    return db.query(models.Assignment).filter(
        models.Assignment.class_id == student.class_id,
        models.Assignment.status == models.AssignmentStatus.PUBLISHED
    ).all()


@router.get("/assignments/overview", response_model=List[schemas.StudentAssignmentOverviewItem])
def read_assignments_overview(db: Session = Depends(database.get_db), student: models.Student = Depends(get_current_student_profile)):
    if not student.class_id:
        return []

    # Get all published assignments for the student's class
    assignments = db.query(models.Assignment).filter(
        models.Assignment.class_id == student.class_id,
        models.Assignment.status == models.AssignmentStatus.PUBLISHED
    ).order_by(models.Assignment.due_date.desc()).all()

    # Get all submissions for this student
    submissions = db.query(models.Submission).filter(
        models.Submission.student_id == student.id
    ).all()
    sub_map = {s.assignment_id: s for s in submissions}

    overview = []
    for a in assignments:
        subject_name = a.subject.name if a.subject else "General"
        teacher_name = a.teacher.username if a.teacher else "Unknown"

        a_out = schemas.AssignmentOut(
            id=a.id,
            title=a.title,
            description=a.description,
            due_date=a.due_date,
            status=a.status,
            teacher_id=a.teacher_id,
            class_id=a.class_id,
            subject_id=a.subject_id,
            subject_name=subject_name,
            teacher_name=teacher_name,
            exam_type=a.exam_type,
            question_count=a.question_count,
            difficulty_level=a.difficulty_level,
            question_type=a.question_type,
        )

        has_questions = len(a.questions) > 0 if a.questions else False
        sub = sub_map.get(a.id)

        overview.append(schemas.StudentAssignmentOverviewItem(
            assignment=a_out,
            submission=sub,
            has_questions=has_questions
        ))

    return overview

@router.get("/assignments/{assignment_id}/take", response_model=schemas.AssignmentDetail)
def take_assignment(assignment_id: int, db: Session = Depends(database.get_db), student: models.Student = Depends(get_current_student_profile)):
    # Check if student is in the class
    assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id,
        models.Assignment.class_id == student.class_id,
        models.Assignment.status == models.AssignmentStatus.PUBLISHED
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found or not available")
        
    return assignment

@router.post("/submissions/", response_model=schemas.Submission)
def create_submission(submission: schemas.SubmissionCreate, db: Session = Depends(database.get_db), student: models.Student = Depends(get_current_student_profile)):
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
    
    # Process Answers
    for ans in submission.answers:
        # Calculate points only if auto-gradable (e.g., MCQ)
        is_correct = False
        points = 0
        
        question = db.query(models.Question).filter(models.Question.id == ans.question_id).first()
        if question:
            if question.question_type in [models.QuestionType.MULTIPLE_CHOICE, models.QuestionType.TRUE_FALSE]:
                selected_opt = db.query(models.QuestionOption).filter(models.QuestionOption.id == ans.selected_option_id).first()
                if selected_opt and selected_opt.is_correct:
                    is_correct = True
                    points = question.points
                    
            db_answer = models.StudentAnswer(
                submission_id=new_submission.id,
                question_id=ans.question_id,
                selected_option_id=ans.selected_option_id,
                text_answer=ans.text_answer,
                is_correct=is_correct,
                points_awarded=points
            )
            db.add(db_answer)
            
    db.commit()
    db.refresh(new_submission)
    return new_submission

@router.get("/submissions/{submission_id}", response_model=schemas.SubmissionDetail)
def read_submission_detail(submission_id: int, db: Session = Depends(database.get_db), student: models.Student = Depends(get_current_student_profile)):
    submission = db.query(models.Submission).filter(
        models.Submission.id == submission_id,
        models.Submission.student_id == student.id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
        
    return submission

@router.get("/grades", response_model=List[schemas.StudentSubjectStats])
def read_student_grades(db: Session = Depends(database.get_db), student: models.Student = Depends(get_current_student_profile)):
    if not student.class_id:
        return []

    # 1. Get all subjects for the school (or specific to grade if we tracked that, but usually subjects are global per school or linked to assignments)
    # Better approach: Find all assignments for this student's class, grouping by subject.
    
    # Get all published assignments for the class
    assignments = db.query(models.Assignment).filter(
        models.Assignment.class_id == student.class_id,
        models.Assignment.status == models.AssignmentStatus.PUBLISHED
    ).all()
    
    # Get all submissions for this student
    submissions = db.query(models.Submission).filter(
        models.Submission.student_id == student.id
    ).all()
    
    submitted_assignment_ids = {s.assignment_id for s in submissions}
    
    # Group by Subject
    subject_stats = {}
    
    # Initialize with known subjects if possible? 
    # For now, let's just base it on available assignments. If a subject has no assignments, it probably doesn't matter for "Grades" view yet.
    # Alternatively, we could fetch all subjects for the school to show 0/0.
    
    # Initialize with known subjects
    school_subjects = db.query(models.Subject).filter(models.Subject.school_id == student.school_id).all()
    for sub in school_subjects:
        subject_stats[sub.id] = {
            "subject_id": sub.id,
            "subject_name": sub.name,
            "total_assignments": 0,
            "completed_assignments": 0,
            "pending_assignments": 0
        }
        
    for a in assignments:
        sub_id = a.subject_id
        if sub_id is None:
            # Handle General assignments
            if 0 not in subject_stats:
                subject_stats[0] = {
                    "subject_id": 0,
                    "subject_name": "General",
                    "total_assignments": 0,
                    "completed_assignments": 0,
                    "pending_assignments": 0
                }
            sub_id = 0
        elif sub_id not in subject_stats:
             # Should be there if we fetched all school subjects.
             # If not, add it dynamically (though unlikely if DB consistent)
            subject_stats[sub_id] = {
                "subject_id": sub_id,
                "subject_name": a.subject.name if a.subject else "Unknown",
                "total_assignments": 0,
                "completed_assignments": 0,
                "pending_assignments": 0
            }

        subject_stats[sub_id]["total_assignments"] += 1
        if a.id in submitted_assignment_ids:
            subject_stats[sub_id]["completed_assignments"] += 1
        else:
            subject_stats[sub_id]["pending_assignments"] += 1
            
    # Convert to list
    return [schemas.StudentSubjectStats(**stats) for stats in subject_stats.values()]
