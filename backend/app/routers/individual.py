from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from .. import database, models, schemas, auth

router = APIRouter(
    prefix="/individual",
    tags=["individual"],
    responses={404: {"description": "Not found"}},
)

# --- Authentication Dependency ---
def get_current_individual_user(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role != models.UserRole.INDIVIDUAL:
         raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

# --- Public Registration Endpoint ---
# Placed here or in auth_routes? Placing here for cohesion with "Individual" feature, 
# but frontend will call this openly.
@router.post("/register", response_model=schemas.User)
def register_individual(user_data: schemas.UserCreate, name: str, db: Session = Depends(database.get_db)):
    # 1. Check existing
    if db.query(models.User).filter(models.User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
        
    # 1.5 Find 'Individual' School
    individual_school_name = "Individual"
    individual_school = db.query(models.School).filter(models.School.name == individual_school_name).first()
    
    # If not found, log warning or create? Seed script should have run.
    # We'll just proceed with None if not found, or raise 500?
    # Better to be robust:
    individual_school_id = individual_school.id if individual_school else None

        
    # 2. Create User
    hashed_password = auth.get_password_hash(user_data.password)
    new_user = models.User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=hashed_password,
        role=models.UserRole.INDIVIDUAL,
        active=True,
        school_id=individual_school_id # Link User to specific school
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 3. Create Linked Student Profile (Essential for taking quizzes)
    # School/Grade/Class are None initially
    new_student = models.Student(
        name=name,
        user_id=new_user.id,
        active=True,
        school_id=individual_school_id, # Link Student to specific school
        grade_id=None,
        class_id=None
    )
    db.add(new_student)
    db.commit()
    
    return new_user

# --- Quiz Management for Individual ---

@router.get("/quizzes", response_model=List[schemas.Assignment])
def read_my_quizzes(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_individual_user)):
    # Individual users "own" assignments they created.
    # We use teacher_id to track ownership even though they are role=INDIVIDUAL.
    return db.query(models.Assignment).filter(models.Assignment.teacher_id == current_user.id).all()

# New Schema for creation locally to handle extra fields without changing global schema yet if strictly typed
# Or just use kwargs if we are lenient. But Pydantic is better.
# Let's define a local Pydantic model or use a Dict for now to allow extra fields?
# No, better to extend AssignmentCreate in strict way? 
# For now, we'll accept specific body.
# Actually, the user wants "Subject" name text.
from pydantic import BaseModel
class IndividualQuizCreate(BaseModel):
    title: str
    description: Optional[str] = None
    subject_name: str # Typeahead value
    exam_type: Optional[str] = None
    question_count: Optional[int] = 10
    difficulty_level: Optional[str] = "Medium"
    question_type: Optional[str] = "Multiple Choice"
    due_date: Optional[datetime] = None
    use_pdf_context: Optional[bool] = False

@router.post("/quizzes", response_model=schemas.Assignment)
def create_personal_quiz(quiz_data: IndividualQuizCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_individual_user)):
    # 1. Handle Subject
    # Check if subject exists in user's school
    # current_user.school_id should be set (e.g. "Individual" school)
    
    school_id = current_user.school_id
    if not school_id:
        # Fallback if somehow null, search for "Individual" school
        ind_school = db.query(models.School).filter(models.School.name == "Individual").first()
        if ind_school:
            school_id = ind_school.id
    
    subject = None
    if school_id:
        subject = db.query(models.Subject).filter(
            models.Subject.name == quiz_data.subject_name,
            models.Subject.school_id == school_id
        ).first()
        
        if not subject:
            # Create new subject
            subject = models.Subject(name=quiz_data.subject_name, school_id=school_id)
            db.add(subject)
            db.commit()
            db.refresh(subject)
    
    # 2. Create Assignment
    new_assignment = models.Assignment(
        title=quiz_data.title,
        description=quiz_data.description,
        due_date=quiz_data.due_date,
        status=models.AssignmentStatus.PUBLISHED, # Auto-publish for self
        teacher_id=current_user.id, # Owner
        class_id=None, # Personal
        subject_id=subject.id if subject else None,
        
        # New Fields
        exam_type=quiz_data.exam_type,
        question_count=quiz_data.question_count,
        difficulty_level=quiz_data.difficulty_level,
        question_type=quiz_data.question_type
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    
    # TODO: If we store exam_type, difficulty etc, we need columns. 
    # For now, we proceed as creating the container. 
    # If the user expects generation, that would be a separate step or we'd trigger it here.
    
    return new_assignment

@router.get("/subjects", response_model=List[schemas.Subject])
def read_individual_subjects(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_individual_user)):
    # Return subjects for current user's school
    if not current_user.school_id:
        return []
    return db.query(models.Subject).filter(models.Subject.school_id == current_user.school_id).all()

@router.post("/quizzes/{quiz_id}/questions", response_model=schemas.Question)
def add_question_to_quiz(quiz_id: int, question: schemas.QuestionCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_individual_user)):
    # Verify ownership
    quiz = db.query(models.Assignment).filter(
        models.Assignment.id == quiz_id, 
        models.Assignment.teacher_id == current_user.id
    ).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
        
    # Create Question
    try:
        q_type = models.QuestionType(question.question_type)
    except ValueError:
        q_type = models.QuestionType.MULTIPLE_CHOICE

    new_q = models.Question(
        text=question.text,
        points=question.points,
        question_type=q_type,
        assignment_id=quiz_id,
        difficulty_level="Medium" # Default
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    
    # Options
    for opt in question.options:
        db.add(models.QuestionOption(
            text=opt.text,
            is_correct=opt.is_correct,
            question_id=new_q.id
        ))
    db.commit()
    
    return new_q

# --- Taking Quizzes (Simulate Student Behavior) ---

@router.get("/quizzes/{quiz_id}/take", response_model=schemas.AssignmentDetail)
def get_quiz_for_taking(quiz_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_individual_user)):
    # Allow taking own quiz
    quiz = db.query(models.Assignment).filter(
        models.Assignment.id == quiz_id,
        models.Assignment.teacher_id == current_user.id
    ).first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    return quiz

@router.post("/submissions", response_model=schemas.Submission)
def submit_quiz_attempt(submission: schemas.SubmissionCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_individual_user)):
    # Find linked student profile
    student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student profile missing")

    # Proceed with submission (logic shared with student router ideally, but duplicated for now to decouple)
    new_submission = models.Submission(
        assignment_id=submission.assignment_id,
        student_id=student.id,
        status=models.SubmissionStatus.SUBMITTED,
        submitted_at=datetime.now()
    )
    db.add(new_submission)
    db.commit()
    db.refresh(new_submission)
    
    # Grading Logic (Simple auto-grade)
    for ans in submission.answers:
        is_correct = False
        points = 0
        q = db.query(models.Question).filter(models.Question.id == ans.question_id).first()
        if q and q.question_type in [models.QuestionType.MULTIPLE_CHOICE, models.QuestionType.TRUE_FALSE]:
            opt = db.query(models.QuestionOption).filter(models.QuestionOption.id == ans.selected_option_id).first()
            if opt and opt.is_correct:
                is_correct = True
                points = q.points
        
        db.add(models.StudentAnswer(
            submission_id=new_submission.id,
            question_id=ans.question_id,
            selected_option_id=ans.selected_option_id,
            text_answer=ans.text_answer,
            is_correct=is_correct,
            points_awarded=points
        ))
        
    db.commit()
    return new_submission

# --- Settings / Linking ---

@router.put("/link-school")
def link_to_school(school_id: int, grade_id: int, class_id: int = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_individual_user)):
    student = db.query(models.Student).filter(models.Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Profile not found")
        
    # Verify existence
    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
        
    student.school_id = school_id
    student.grade_id = grade_id
    student.class_id = class_id
    
    # Also update User school_id for easier role checks?
    current_user.school_id = school_id
    
    db.commit()
    return {"message": "Linked successfully"}

# --- Metadata for Linking ---

@router.get("/schools-metadata", response_model=List[schemas.School])
def read_schools_metadata(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_individual_user)):
    return db.query(models.School).filter(models.School.active == True).all()

@router.get("/schools/{school_id}/grades", response_model=List[schemas.Grade])
def read_school_grades(school_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_individual_user)):
    return db.query(models.Grade).filter(models.Grade.school_id == school_id).all()

@router.get("/schools/{school_id}/grades/{grade_id}/classes", response_model=List[schemas.Class])
def read_school_classes(school_id: int, grade_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_individual_user)):
    return db.query(models.Class).filter(models.Class.school_id == school_id, models.Class.grade_id == grade_id).all()
