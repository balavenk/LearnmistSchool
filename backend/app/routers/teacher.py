from fastapi import Body, Query, APIRouter, Depends, HTTPException
import logging
import json

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, and_
from typing import List, Optional
from datetime import datetime
from app import database
from app import models
from app import schemas
from app import auth
from app.services import rag_service
from app.config import settings
from app.utils.pagination import paginate_query
from sqlalchemy import func, or_, and_
from app.services.pdf_generator import CBSEPaperGenerator
from fastapi.responses import Response


router = APIRouter(
    prefix="/teacher",
    tags=["teacher"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

def safe_json_parse(raw: str):
    if not raw: return []
    try:
        import json
        parsed = json.loads(raw)
        if isinstance(parsed, str): parsed = json.loads(parsed)
        return parsed if isinstance(parsed, list) else []
    except Exception: return []

def get_current_teacher(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role != models.UserRole.TEACHER:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

def get_current_teacher_or_individual(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role not in [models.UserRole.TEACHER, models.UserRole.INDIVIDUAL]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


def validate_teacher_grade_access(db: Session, teacher_id: int, grade_id: int):
    """
    Ensures the teacher is assigned to the specified grade.
    """
    access = db.query(models.TeacherAssignment).filter(
        models.TeacherAssignment.teacher_id == teacher_id,
        models.TeacherAssignment.grade_id == grade_id
    ).first()
    if not access:
        raise HTTPException(
            status_code=403, 
            detail=f"Access denied: You are not assigned to Grade ID {grade_id}. Please contact your administrator."
        )


@router.get("/settings")
def get_teacher_settings():
    """Get teacher module settings including pagination defaults"""
    return {
        "pagination": {
            "default_page_size": settings.DEFAULT_PAGE_SIZE,
            "max_page_size": settings.MAX_PAGE_SIZE
        }
    }


@router.post("/students/", response_model=schemas.Student)
def create_student(student: schemas.StudentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # Verify grade exists and belongs to the same school
    grade = db.query(models.Grade).filter(
        models.Grade.id == student.grade_id,
        models.Grade.school_id == current_user.school_id
    ).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found in this school")
    
    # If class_id is provided, verify it
    if student.class_id:
        class_obj = db.query(models.Class).filter(
            models.Class.id == student.class_id,
            models.Class.school_id == current_user.school_id
        ).first()
        if not class_obj:
            raise HTTPException(status_code=404, detail="Class not found in this school")
        if class_obj.grade_id != student.grade_id:
            raise HTTPException(status_code=400, detail="Class does not belong to the selected grade")

    # 1. Username — use supplied one or auto-generate
    if student.username:
        # Validate and use the provided username
        username = student.username.strip().lower()
        username = "".join(c for c in username if c.isalnum())
        if not username:
            raise HTTPException(status_code=400, detail="Invalid username")
        if db.query(models.User).filter(models.User.username == username).first():
            raise HTTPException(status_code=400, detail=f"Username '{username}' is already taken")
            
    if student.email:
        from sqlalchemy import func
        if db.query(models.User).filter(func.lower(models.User.email) == student.email.strip().lower()).first():
            raise HTTPException(status_code=400, detail="Email ID already exists")
    else:
        # Auto-generate: firstname + first char of lastname
        parts = student.name.strip().split()
        if len(parts) >= 2:
            base_username = f"{parts[0]}{parts[-1][0]}".lower()
        else:
            base_username = parts[0].lower()
        base_username = "".join(c for c in base_username if c.isalnum())
        username = base_username
        counter = 1
        while db.query(models.User).filter(models.User.username == username).first():
            username = f"{base_username}{counter}"
            counter += 1

    # 2. Create User record for login
    hashed_password = auth.get_password_hash(student.password or "password123")
    new_user = models.User(
        username=username,
        email=student.email,
        hashed_password=hashed_password,
        role=models.UserRole.STUDENT,
        school_id=current_user.school_id,
        active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 3. Create Student record linked to User
    new_student = models.Student(
        name=student.name,
        email=student.email,
        grade_id=student.grade_id,
        class_id=student.class_id,
        school_id=current_user.school_id,
        user_id=new_user.id,
        active=True
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student

@router.get("/students/", response_model=schemas.PaginatedResponse[schemas.StudentWithMetrics])
def read_students(
    grade_id: int = None,
    class_id: int = None,
    page: int = 1,
    page_size: int = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    # Use default page size from config if not provided
    if page_size is None:
        page_size = settings.DEFAULT_PAGE_SIZE
    
    # Validate pagination parameters
    if page < 1:
        page = 1
    if page_size < 1 or page_size > settings.MAX_PAGE_SIZE:
        page_size = settings.DEFAULT_PAGE_SIZE
    
    # Calculate offset
    offset = (page - 1) * page_size
    
    # Get visible class IDs first
    visible_classes = db.query(models.Class.id).join(
        models.TeacherAssignment, 
        (models.TeacherAssignment.class_id == models.Class.id) | 
        ((models.TeacherAssignment.class_id == None) & (models.TeacherAssignment.grade_id == models.Class.grade_id))
    ).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    ).distinct().all()
    
    visible_class_ids = [c[0] for c in visible_classes]
    
    # Also include grade IDs to see students not yet in a class
    visible_grade_ids = db.query(models.TeacherAssignment.grade_id).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    ).distinct().all()
    visible_grade_ids = [g[0] for g in visible_grade_ids]

    query = db.query(models.Student).filter(
        models.Student.school_id == current_user.school_id,
        (models.Student.class_id.in_(visible_class_ids)) |
        ((models.Student.class_id == None) & (models.Student.grade_id.in_(visible_grade_ids)))
    )
    
    # Filter by grade_id if provided
    if grade_id:
        query = query.filter(models.Student.grade_id == grade_id)
    
    # Filter by class_id if provided
    if class_id:
        if class_id not in visible_class_ids:
                return schemas.PaginatedResponse(
                items=[],
                total=0,
                page=page,
                page_size=page_size,
                total_pages=0
            )
        query = query.filter(models.Student.class_id == class_id)
    
    # Get total count
    total_count = query.count()
    total_pages = (total_count + page_size - 1) // page_size
    
    # Get paginated results
    students = query.offset(offset).limit(page_size).all()
    
    if not students:
        return schemas.PaginatedResponse(
            items=[],
            total=total_count,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    student_ids = [s.id for s in students]
    class_ids = list(set([s.class_id for s in students if s.class_id]))

    # 1. Assigned counts (Total published for student's class or grade)
    # We'll use a more direct subquery approach to be 100% precise
    assigned_counts = db.query(
        models.Student.id, 
        func.count(models.Assignment.id).label('total')
    ).select_from(models.Student).join(
        models.Assignment,
        (models.Assignment.status == models.AssignmentStatus.PUBLISHED) & (
            (models.Assignment.class_id == models.Student.class_id) | 
            ((models.Assignment.class_id == None) & (models.Assignment.grade_id == models.Student.grade_id))
        )
    ).filter(models.Student.id.in_(student_ids)).group_by(models.Student.id).all()
    assigned_map = {sid: count for sid, count in assigned_counts}

    # 2. Submission counts (Unique assignments per student and status)
    submission_metrics = db.query(
        models.Submission.student_id,
        models.Submission.status,
        func.count(func.distinct(models.Submission.assignment_id))
    ).filter(
        models.Submission.student_id.in_(student_ids)
    ).group_by(models.Submission.student_id, models.Submission.status).all()
    
    sub_map = {}
    for sid, status, count in submission_metrics:
        if sid not in sub_map:
            sub_map[sid] = {"completed": 0, "graded": 0}
        if status == models.SubmissionStatus.SUBMITTED:
            sub_map[sid]["completed"] = count # Tab "Completed"
        elif status == models.SubmissionStatus.GRADED:
            sub_map[sid]["graded"] = count # Tab "Graded"

    student_metrics = []
    for s in students:
        s_dict = {
            "id": s.id,
            "name": s.name,
            "active": s.active,
            "school_id": s.school_id,
            "grade_id": s.grade_id,
            "class_id": s.class_id,
            "username": s.username,
            "user_id": s.user_id,
            "last_login": s.last_login,
            "email": s.email,
            "assigned_count": assigned_map.get(s.id, 0),
            "completed_count": sub_map.get(s.id, {}).get("completed", 0),
            "graded_count": sub_map.get(s.id, {}).get("graded", 0),
            "pending_count": assigned_map.get(s.id, 0) - sub_map.get(s.id, {}).get("completed", 0) - sub_map.get(s.id, {}).get("graded", 0)
        }
        student_metrics.append(schemas.StudentWithMetrics(**s_dict))
    
    return schemas.PaginatedResponse(
        items=student_metrics,
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/students/{student_id}", response_model=schemas.Student)
def read_student(student_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    student = db.query(models.Student).filter(
        models.Student.id == student_id,
        models.Student.school_id == current_user.school_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student

@router.post("/assignments/", response_model=schemas.Assignment)
def create_assignment(assignment: schemas.AssignmentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # Support both grade_id (new) and assigned_to_class_id (legacy)
    class_or_grade_id = assignment.grade_id or assignment.assigned_to_class_id
    
    # Note: Frontend now sends grade_id, but backend stores in class_id field for compatibility
    # In future, we can migrate to separate grade_id and class_id fields
    if class_or_grade_id:
        # Verify the ID belongs to school (check both Grade and Class tables)
        grade_obj = db.query(models.Grade).filter(
            models.Grade.id == class_or_grade_id,
            models.Grade.school_id == current_user.school_id
        ).first()
        
        if not grade_obj:
            # Try as class_id for backward compatibility
            class_obj = db.query(models.Class).filter(
                models.Class.id == class_or_grade_id,
                models.Class.school_id == current_user.school_id
            ).first()
            if not class_obj:
                raise HTTPException(status_code=404, detail="Grade/Class not found")
        
    # Validation: Ensure teacher is assigned to this grade
    validate_teacher_grade_access(db, current_user.id, assignment.grade_id or class_or_grade_id)

    new_assignment = models.Assignment(
        title=assignment.title,
        description=assignment.description,
        due_date=assignment.due_date,
        status=assignment.status,
        teacher_id=current_user.id,
        grade_id=assignment.grade_id or (class_or_grade_id if not assignment.assigned_to_class_id else None),
        class_id=assignment.assigned_to_class_id or (class_or_grade_id if not assignment.grade_id else None),
        subject_id=assignment.subject_id,
        exam_type=assignment.exam_type or "Quiz",
        question_count=assignment.question_count or 0,
        difficulty_level=assignment.difficulty_level or "Medium",
        question_type=assignment.question_type or "Mixed"
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment

@router.get("/assignments/", response_model=List[schemas.Assignment])
def read_assignments(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # Get visible grade IDs for this teacher
    visible_grade_ids = db.query(models.TeacherAssignment.grade_id).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    ).distinct().all()
    visible_grade_ids = [g[0] for g in visible_grade_ids]

    return db.query(models.Assignment).filter(
        models.Assignment.teacher_id == current_user.id,
        models.Assignment.grade_id.in_(visible_grade_ids)
    ).all()

@router.post("/assignments/ai-generate", response_model=schemas.Assignment)
async def generate_ai_assignment(
    req: schemas.AssignmentAICreate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_teacher)
):
    """
    Standard REST endpoint for AI Quiz Generation.
    Replaces the WebSocket terminal with a standard loading experience.
    """
    logger.info(f"🚀 [AI GEN] Starting generation for teacher {current_user.id}: {req.topic}")
    
    # Validation: Ensure teacher is assigned to this grade
    validate_teacher_grade_access(db, current_user.id, req.grade_id)

    # 1. Get Subject Name for RAG Context
    subject = db.query(models.Subject).filter(models.Subject.id == req.subject_id).first()
    subject_name = subject.name if subject else "General Knowledge"
    logger.info(f"📍 [AI GEN] Step 1: Resolved subject to '{subject_name}'")

    # 2. Call RAG Service
    logger.info(f"🤖 [AI GEN] Step 2: Calling RAG service with topic: {req.topic}")
    try:
        generated_questions = await rag_service.generate_quiz_questions(
            topic=req.topic,
            subject_name=subject_name,
            grade_level=req.grade_level,
            difficulty=req.difficulty,
            count=req.question_count,
            question_type=req.question_type,
            use_pdf_context=req.use_pdf_context,
            subject_id=req.subject_id,
            grade_id=req.grade_id,
            school_id=current_user.school_id,
            source_type=req.source_type,
            use_question_bank=req.use_question_bank,
            db=db,
        )
    except ValueError as ve:
        logger.warning(f"⚠️ [AI GEN] RAG Service validation error: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"❌ [AI GEN] RAG Service failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

    if not generated_questions:
        logger.warning(f"⚠️ [AI GEN] RAG returned no questions for '{req.topic}'")
        raise HTTPException(status_code=500, detail="AI generation failed or returned no questions.")

    logger.info(f"✅ [AI GEN] Step 3: Generated {len(generated_questions)} questions")

    # 3. Create Assignment
    title = f"AI Quiz: {req.topic}"
    description = f"A {req.difficulty} level quiz about {req.topic}. Generated by AI."
    
    new_assignment = models.Assignment(
        title=title,
        description=description,
        status=models.AssignmentStatus.DRAFT,
        teacher_id=current_user.id,
        due_date=req.due_date,
        subject_id=req.subject_id,
        grade_id=req.grade_id,
        class_id=None, # Default to grade-level, can be refined later if needed
        exam_type="Quiz",
        question_count=req.question_count or 0,
        difficulty_level=req.difficulty or "Medium",
        question_type=getattr(req, 'question_type', "Mixed") or "Mixed",
        generation_type="AI Generated"
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    logger.info(f"📦 [AI GEN] Step 4: Created Draft Assignment ID {new_assignment.id}")

    # 4. Create Questions
    for i, q_data in enumerate(generated_questions):
        logger.debug(f"📝 [AI GEN] Saving question {i+1}/{len(generated_questions)}")
        # Map Type
        q_type_str = q_data.get("question_type", "MULTIPLE_CHOICE")
        try:
            q_type = models.QuestionType(q_type_str)
        except ValueError:
            q_type = models.QuestionType.MULTIPLE_CHOICE
            
        new_q = models.Question(
            text=q_data.get("text", "Question Text"),
            points=req.points,
            question_type=q_type,
            assignment_id=new_assignment.id,
            school_id=current_user.school_id,
            subject_id=req.subject_id,
            grade_id=req.grade_id,
            difficulty_level=req.difficulty,
            is_bank_question=False
        )
        db.add(new_q)
        db.commit()
        db.refresh(new_q)
        
        # Options
        for opt in q_data.get("options", []):
            new_opt = models.QuestionOption(
                text=opt.get("text", ""),
                is_correct=opt.get("is_correct", False),
                question_id=new_q.id
            )
            db.add(new_opt)
    
    db.commit()
    logger.info(f"🏁 [AI GEN] Finished! Assignment {new_assignment.id} is ready.")
    return new_assignment

@router.get("/question-bank/questions", response_model=List[schemas.QuestionOut])
def get_question_bank_questions(
    subject_id: Optional[int] = None,
    grade_id: Optional[int] = None,
    year: Optional[int] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    query = db.query(models.Question).filter(
        models.Question.is_bank_question == True,
        models.Question.school_id == current_user.school_id
    )
    
    if subject_id:
        query = query.filter(models.Question.subject_id == subject_id)
    if grade_id:
        query = query.filter(models.Question.grade_id == grade_id)
    if year:
        query = query.filter(models.Question.year == year)
        
    return query.all()

@router.post("/assignments/from-bank", response_model=schemas.AssignmentOut)
def create_assignment_from_bank(
    data: schemas.AssignmentFromBankCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    # Support both grade_id (new) and class_id (legacy)
    class_or_grade_id = data.grade_id or data.class_id
    
    # Validation: Ensure teacher is assigned to this grade
    if class_or_grade_id:
        validate_teacher_grade_access(db, current_user.id, class_or_grade_id)

    # 1. Create Assignment
    new_assignment = models.Assignment(
        title=data.title,
        description=data.description,
        due_date=data.due_date,
        status=models.AssignmentStatus.DRAFT,
        teacher_id=current_user.id,
        grade_id=data.grade_id,
        class_id=data.class_id,
        subject_id=data.subject_id,
        exam_type="Quiz",
        question_count=len(data.question_ids) if data.question_ids else 0,
        difficulty_level="Medium",
        question_type="Mixed",
        generation_type="Question Bank"
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    
    # 2. Clone Questions
    original_questions = db.query(models.Question).filter(models.Question.id.in_(data.question_ids)).all()
    
    for q in original_questions:
        new_q = models.Question(
            text=q.text,
            points=q.points,
            question_type=q.question_type,
            difficulty_level=q.difficulty_level,
            assignment_id=new_assignment.id,
            school_id=current_user.school_id,
            subject_id=data.subject_id, # Inherit from new assignment/selection
            class_id=data.class_id,     # Inherit from new assignment/selection
            grade_id=data.grade_id,
            parent_question_id=q.id,    # Link to parent
            is_answered=q.is_answered,
            year=q.year
        )
        db.add(new_q)
        db.commit() # Commit to get ID
        db.refresh(new_q)
        
        # Clone Options
        for opt in q.options:
            new_opt = models.QuestionOption(
                text=opt.text,
                is_correct=opt.is_correct,
                question_id=new_q.id
            )
            db.add(new_opt)
            
    db.commit()
    return new_assignment

@router.put("/assignments/{assignment_id}/publish")
def publish_assignment(assignment_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id,
        models.Assignment.teacher_id == current_user.id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    assignment.status = models.AssignmentStatus.PUBLISHED
    db.commit()
    db.refresh(assignment)
    return assignment

@router.patch("/assignments/{assignment_id}", response_model=schemas.Assignment)
def update_assignment(
    assignment_id: int, 
    assignment_update: schemas.AssignmentUpdate, 
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_teacher)
):
    """
    Update an existing assignment.
    Only DRAFT assignments can have their due date updated for now as per user request.
    """
    assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id,
        models.Assignment.teacher_id == current_user.id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    
    if assignment.status != models.AssignmentStatus.DRAFT:
        raise HTTPException(status_code=400, detail="Only draft assignments can be edited")
    
    if assignment_update.title is not None:
        assignment.title = assignment_update.title
    if assignment_update.description is not None:
        assignment.description = assignment_update.description
    if assignment_update.due_date is not None:
        assignment.due_date = assignment_update.due_date
    if assignment_update.grade_id is not None:
        assignment.grade_id = assignment_update.grade_id
    if assignment_update.subject_id is not None:
        assignment.subject_id = assignment_update.subject_id
        
    db.commit()
    db.refresh(assignment)
    return assignment

@router.get("/questions/", response_model=schemas.PaginatedResponse[schemas.QuestionOut])
def read_questions(
    subject_id: Optional[int] = None, 
    class_id: Optional[int] = None, 
    grade_id: Optional[int] = None,
    difficulty: Optional[str] = None,
    search: Optional[str] = None,
    source_year: Optional[str] = None,
    source_type: Optional[str] = None,
    points: Optional[int] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=500),
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_teacher)
):
    """
    Get all questions for the current teacher. Includes assignment questions and school bank questions.
    """
    query = db.query(models.Question).outerjoin(
        models.Assignment, models.Question.assignment_id == models.Assignment.id
    ).outerjoin(
        models.Class, models.Question.class_id == models.Class.id
    )
    
    # Filter by Teacher (security) OR is_bank_question for the school
    query = query.filter(
        or_(
            models.Assignment.teacher_id == current_user.id,
            (models.Question.is_bank_question == True) & (models.Question.school_id == current_user.school_id)
        )
    )
    
    # Exclude derived questions (only show originals)
    query = query.filter(models.Question.parent_question_id == None)
    
    # Context Filters (populated in models now)
    if class_id:
        query = query.filter(or_(models.Assignment.class_id == class_id, models.Question.class_id == class_id))
    if grade_id:
        query = query.filter(
            or_(
                models.Assignment.grade_id == grade_id, 
                models.Class.grade_id == grade_id,
                and_(
                    models.Question.assignment_id == None, 
                    models.Question.class_id == None,
                    models.Question.grade_id == grade_id
                )
            )
        )
    if subject_id:
        query = query.filter(models.Question.subject_id == subject_id)
        
    # Optional Filters
    if difficulty:
        query = query.filter(models.Question.difficulty_level == difficulty)
         
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(models.Question.text.ilike(search_fmt))
        
    if source_year:
        query = query.filter(models.Question.source_year == source_year)
        
    if source_type:
        query = query.filter(models.Question.source_type == source_type)
        
    if points is not None:
        query = query.filter(models.Question.points == points)
        
    return paginate_query(query, page, page_size)

@router.get("/questions/years", response_model=List[dict])
def get_available_question_years(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):

    query = db.query(
        models.Question.source_year.label("year"),
        func.count(models.Question.id).label("count")
    ).outerjoin(
        models.Assignment, models.Question.assignment_id == models.Assignment.id
    ).filter(
        models.Question.source_year != None,
        models.Question.source_year != "",
        or_(
            models.Assignment.teacher_id == current_user.id,
            and_(
                models.Question.assignment_id == None,
                models.Question.school_id == current_user.school_id
            )
        )
    ).group_by(models.Question.source_year).order_by(models.Question.source_year.desc())
    
    return [{"year": row.year, "count": row.count} for row in query.all()]

@router.post("/bank-questions", response_model=schemas.QuestionOut)
def create_bank_question(
    question_in: schemas.BankQuestionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    new_q = models.Question(
        text=question_in.text,
        points=question_in.points,
        question_type=question_in.question_type,
        difficulty_level=question_in.difficulty_level,
        source_year=question_in.source_year,
        source_type=question_in.source_type or "Manual",
        bloom_level=question_in.bloom_level,
        chapter_name=question_in.chapter_name,
        answer_key=question_in.answer_key,
        correct_answer=question_in.correct_answer,
        subject_id=question_in.subject_id,
        grade_id=question_in.grade_id,
        school_id=current_user.school_id,
        is_bank_question=True,
        assignment_id=None
    )
    db.add(new_q)
    db.flush()
    
    for opt in question_in.options:
        new_opt = models.QuestionOption(
            text=opt.text,
            is_correct=opt.is_correct,
            question_id=new_q.id
        )
        db.add(new_opt)
        
    db.commit()
    db.refresh(new_q)
    return new_q

@router.post("/bank-questions/bulk")
def create_bank_questions_bulk(
    questions_in: List[schemas.BankQuestionCreate],
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    created_count = 0
    for q_in in questions_in:
        new_q = models.Question(
            text=q_in.text,
            points=q_in.points,
            question_type=q_in.question_type,
            difficulty_level=q_in.difficulty_level,
            source_year=q_in.source_year,
            source_type=q_in.source_type or "Manual",
            bloom_level=q_in.bloom_level,
            chapter_name=q_in.chapter_name,
            answer_key=q_in.answer_key,
            correct_answer=q_in.correct_answer,
            subject_id=q_in.subject_id,
            grade_id=q_in.grade_id,
            school_id=current_user.school_id,
            is_bank_question=True,
            assignment_id=None
        )
        db.add(new_q)
        db.flush()
        
        for opt in q_in.options:
            db.add(models.QuestionOption(
                text=opt.text,
                is_correct=opt.is_correct,
                question_id=new_q.id
            ))
        created_count += 1
        
    db.commit()
    return {"message": f"Successfully created {created_count} questions"}

@router.put("/bank-questions/{question_id}", response_model=schemas.QuestionOut)
def update_bank_question(
    question_id: int,
    question_in: schemas.BankQuestionCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    q = db.query(models.Question).filter(
        models.Question.id == question_id,
        models.Question.school_id == current_user.school_id,
        models.Question.assignment_id == None
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Bank question not found")
        
    for key, value in question_in.model_dump(exclude={"options"}, exclude_unset=True).items():
        setattr(q, key, value)
        
    if question_in.options is not None:
        db.query(models.QuestionOption).filter(models.QuestionOption.question_id == q.id).delete()
        for opt in question_in.options:
            db.add(models.QuestionOption(text=opt.text, is_correct=opt.is_correct, question_id=q.id))
            
    db.commit()
    db.refresh(q)
    return q

@router.delete("/bank-questions/{question_id}")
def delete_bank_question(
    question_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    q = db.query(models.Question).filter(
        models.Question.id == question_id,
        models.Question.school_id == current_user.school_id,
        models.Question.assignment_id == None
    ).first()
    if not q:
        raise HTTPException(status_code=404, detail="Bank question not found")
        
    db.delete(q)
    db.commit()
    return {"ok": True}

@router.put("/assignments/{assignment_id}/due-date", response_model=schemas.Assignment)
def update_assignment_due_date(
    assignment_id: int,
    due_date: datetime = Body(..., embed=True),
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id,
        models.Assignment.teacher_id == current_user.id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    assignment.due_date = due_date
    db.commit()
    db.refresh(assignment)
    return assignment

@router.delete("/assignments/{assignment_id}")
def delete_assignment(assignment_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id,
        models.Assignment.teacher_id == current_user.id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Delete associated questions (cascade should handle this if configured, but let's be safe or rely on DB)
    # If standard ForeignKey with cascade is set, db.delete(assignment) is enough.
    # Assuming standard setup:
    db.delete(assignment)
    db.commit()
    return {"message": "Assignment deleted successfully"}

@router.get("/classes/", response_model=List[schemas.Class])
def read_classes(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # Return classes where teacher is explicitly assigned, OR classes in grades where teacher is assigned (if we assume grade assignment equals all classes)
    # Given user request "admin only assigns a class", we should perhaps prioritize explicit class_id, but if 'grade_id' is set in TeacherAssignment, it implies access to that grade's classes.
    return db.query(models.Class).join(
        models.TeacherAssignment, 
        (models.TeacherAssignment.class_id == models.Class.id) | 
        ((models.TeacherAssignment.class_id == None) & (models.TeacherAssignment.grade_id == models.Class.grade_id))
    ).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    ).distinct().all()

@router.get("/subjects/", response_model=List[schemas.Subject])
def read_subjects(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # Use subquery to avoid ambiguous join between Subject and TeacherAssignment
    subject_ids = db.query(models.TeacherAssignment.subject_id).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    ).distinct()
    return db.query(models.Subject).filter(models.Subject.id.in_(subject_ids)).all()

@router.get("/grades/", response_model=List[schemas.Grade])
def read_grades(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # Only return grades that the teacher is assigned to via TeacherAssignment
    return db.query(models.Grade).join(
        models.TeacherAssignment,
        models.TeacherAssignment.grade_id == models.Grade.id
    ).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    ).distinct().all()

# --- Question Endpoints ---

@router.get("/assignments/{assignment_id}/questions", response_model=List[schemas.Question])
def read_assignment_questions(assignment_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher_or_individual)):
    """
    Get all questions for a specific assignment.
    Verifies that the assignment belongs to the current teacher.
    """
    # Check assignment ownership
    assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id,
        models.Assignment.teacher_id == current_user.id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    return db.query(models.Question).filter(models.Question.assignment_id == assignment_id).all()

@router.post("/assignments/{assignment_id}/questions", response_model=schemas.Question)
def create_question(assignment_id: int, question: schemas.QuestionCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher_or_individual)):
    assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id,
        models.Assignment.teacher_id == current_user.id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # Map question_type string to Enum
    try:
        q_type = models.QuestionType(question.question_type)
    except ValueError:
        q_type = models.QuestionType.MULTIPLE_CHOICE # Default or Error?

    new_question = models.Question(
        text=question.text,
        points=question.points,
        question_type=q_type,
        assignment_id=assignment_id,
        media_url=question.media_url,
        media_type=question.media_type,
    )
    db.add(new_question)
    db.commit()
    db.refresh(new_question)

    # Add Options
    for opt in question.options:
        new_option = models.QuestionOption(
            text=opt.text,
            is_correct=opt.is_correct,
            question_id=new_question.id
        )
        db.add(new_option)
    
    db.commit()
    db.refresh(new_question)
    return new_question

@router.put("/questions/{question_id}", response_model=schemas.Question)
def update_question(question_id: int, question_update: schemas.QuestionUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher_or_individual)):
    # Find question and verify teacher owns the assignment
    question = db.query(models.Question).join(models.Assignment).filter(
        models.Question.id == question_id,
        models.Assignment.teacher_id == current_user.id
    ).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    if question_update.text is not None:
        question.text = question_update.text
    if question_update.points is not None:
        question.points = question_update.points
    if question_update.question_type is not None:
        try:
            question.question_type = models.QuestionType(question_update.question_type)
        except ValueError:
            pass
    # Update media — allow explicit None to clear the media
    if 'media_url' in question_update.model_fields_set or question_update.media_url is not None:
        question.media_url = question_update.media_url
    if 'media_type' in question_update.model_fields_set or question_update.media_type is not None:
        question.media_type = question_update.media_type

    if question_update.options is not None:
        # Replace options strategy: Delete all and recreate
        db.query(models.QuestionOption).filter(models.QuestionOption.question_id == question.id).delete()
        for opt in question_update.options:
            new_option = models.QuestionOption(
                text=opt.text,
                is_correct=opt.is_correct,
                question_id=question.id
            )
            db.add(new_option)

    db.commit()
    db.refresh(question)
    return question

@router.delete("/questions/{question_id}")
def delete_question(question_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher_or_individual)):
    question = db.query(models.Question).join(models.Assignment).filter(
        models.Question.id == question_id,
        models.Assignment.teacher_id == current_user.id
    ).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    db.delete(question)
    db.commit()
    return {"ok": True}


# --- Grading Endpoints ---

@router.get("/students/{student_id}/pending-submissions", response_model=List[schemas.SubmissionDetail])
def read_student_pending_submissions(student_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # Verify student exists and belongs to teacher's view scope (same school)
    student = db.query(models.Student).filter(models.Student.id == student_id, models.Student.school_id == current_user.school_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get submissions that are NOT graded yet (PENDING or SUBMITTED) or even GRADED if we want to show history?
    # Request said: "not graded by the teacher yet"
    submissions = db.query(models.Submission).join(models.Assignment).filter(
        models.Submission.student_id == student_id,
        # models.Submission.status != models.SubmissionStatus.GRADED, # Showing all for history
        models.Assignment.teacher_id == current_user.id
    ).all()
    return submissions

@router.get("/students/{student_id}/grading-overview", response_model=List[schemas.GradingOverviewItem])
def read_student_grading_overview(student_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # Verify student exists and belongs to teacher's view scope
    student = db.query(models.Student).filter(models.Student.id == student_id, models.Student.school_id == current_user.school_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get all published assignments created by this teacher that are assigned to this student's class
    assignments = db.query(models.Assignment).filter(
        models.Assignment.teacher_id == current_user.id,
        models.Assignment.status == models.AssignmentStatus.PUBLISHED,
        models.Assignment.class_id == student.class_id
    ).all()

    # Get all submissions for this student for these assignments
    assignment_ids = [a.id for a in assignments]
    submissions = db.query(models.Submission).filter(
        models.Submission.student_id == student_id,
        models.Submission.assignment_id.in_(assignment_ids) if assignment_ids else False
    ).all()
    
    # Pre-fetch questions to know if it's a quiz or project
    # We can do this efficiently or just check the relationship
    
    submission_map = {s.assignment_id: s for s in submissions}
    
    overview_items = []
    for assignment in assignments:
        has_questions = len(assignment.questions) > 0
        overview_items.append(schemas.GradingOverviewItem(
            assignment=assignment,
            submission=submission_map.get(assignment.id),
            has_questions=has_questions
        ))
        
    return overview_items

@router.get("/submissions/{submission_id}/details", response_model=schemas.SubmissionDetail)
def read_submission_details(submission_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    submission = db.query(models.Submission).join(models.Assignment).filter(
        models.Submission.id == submission_id,
        models.Assignment.teacher_id == current_user.id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Ensure answers are loaded
    # SQLAlchemy lazy loading should handle it, but explicit join might be better if we needed optimization
    # returning model object directly usually works with Pydantic if from_attributes=True
    return submission

@router.post("/submissions/{submission_id}/grade")
def grade_submission(submission_id: int, grading_data: schemas.GradingUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    submission = db.query(models.Submission).join(models.Assignment).filter(
        models.Submission.id == submission_id,
        models.Assignment.teacher_id == current_user.id
    ).first()
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")

    # Update Submission
    submission.grade = grading_data.grade
    submission.feedback = grading_data.feedback
    submission.status = models.SubmissionStatus.GRADED
    
    # Update Points for each answer
    for ans_update in grading_data.answers:
        q_id = ans_update.get('question_id')
        points = ans_update.get('points')
        is_correct = ans_update.get('is_correct')
        
        answer = db.query(models.StudentAnswer).filter(
            models.StudentAnswer.submission_id == submission.id,
            models.StudentAnswer.question_id == q_id
        ).first()
        
        if answer:
            answer.points_awarded = points
            answer.is_correct = is_correct
            db.add(answer)
        else:
            # Create if missing (e.g. teacher grading a question student skipped?)
            pass

    db.commit()
    db.refresh(submission)
    return submission


@router.get("/dashboard/stats", response_model=schemas.DashboardStats)
def read_dashboard_stats(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # 1. Get visible classes
    classes = db.query(models.Class).join(
        models.TeacherAssignment, 
        (models.TeacherAssignment.class_id == models.Class.id) | 
        ((models.TeacherAssignment.class_id == None) & (models.TeacherAssignment.grade_id == models.Class.grade_id))
    ).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    ).distinct().all()

    class_stats_list = []
    total_students = 0

    for cls in classes:
        # Count students in this class
        s_count = db.query(models.Student).filter(models.Student.class_id == cls.id).count()
        
        # Get grade name
        grade_name = cls.grade.name if cls.grade else "Unknown Grade"

        class_stats_list.append(schemas.ClassStats(
            id=cls.id,
            name=cls.name,
            section=cls.section,
            student_count=s_count,
            grade_name=grade_name
        ))
        total_students += s_count

    # 2. Total Assignments created by this teacher
    visible_grade_ids = db.query(models.TeacherAssignment.grade_id).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    ).distinct().all()
    visible_grade_ids = [g[0] for g in visible_grade_ids]

    total_assignments = db.query(models.Assignment).filter(
        models.Assignment.teacher_id == current_user.id,
        models.Assignment.grade_id.in_(visible_grade_ids)
    ).count()

    # 3. Pending Grading (Submissions that are SUBMITTED for assignments by this teacher)
    pending_grading = db.query(models.Submission).join(models.Assignment).filter(
        models.Assignment.teacher_id == current_user.id,
        models.Submission.status == models.SubmissionStatus.SUBMITTED
    ).count()

    return schemas.DashboardStats(
        total_students=total_students,
        total_classes=len(classes),
        total_assignments=total_assignments,
        pending_grading=pending_grading,
        classes=class_stats_list
    )


@router.get("/grades/{grade_id}/subjects", response_model=List[schemas.Subject])
def read_grade_subjects(grade_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # Get subjects assigned to this teacher for this specific grade
    subjects = db.query(models.Subject).join(models.TeacherAssignment).filter(
        models.TeacherAssignment.teacher_id == current_user.id,
        models.TeacherAssignment.grade_id == grade_id
    ).distinct().all()
    
    return subjects

# --- Exam Types ---

@router.get("/exam-types/", response_model=List[schemas.ExamType])
def read_teacher_exam_types(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    """Get exam types configured for the teacher's school"""
    return db.query(models.ExamType).filter(
        models.ExamType.school_id == current_user.school_id
    ).all()


# --- Question Paper Builder ---

@router.get("/questions/years")
def get_question_years(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    """Get distinct years in the question bank for this school."""
    # Group by `source_year` (string)
    results = db.query(
        models.Question.source_year,
        func.count(models.Question.id).label('count')
    ).join(models.Assignment).filter(
        models.Assignment.teacher_id == current_user.id,
        models.Question.source_year.isnot(None),
        models.Question.source_year != ""
    ).group_by(models.Question.source_year).all()

    return [{"year": r[0], "count": r[1]} for r in results if r[0]]

@router.post("/papers", response_model=schemas.QuestionPaper)
def create_question_paper(
    paper: schemas.QuestionPaperCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    new_paper = models.QuestionPaper(
        title=paper.title,
        board=paper.board,
        grade=paper.grade,
        subject=paper.subject,
        exam_type=paper.exam_type,
        academic_year=paper.academic_year,
        total_marks=paper.total_marks,
        duration=paper.duration,
        set_number=paper.set_number,
        sections_config=paper.sections_config,
        general_instructions=paper.general_instructions,
        created_by_id=current_user.id,
        created_by_role=current_user.role.value,
    )
    db.add(new_paper)
    db.commit()
    db.refresh(new_paper)
    return new_paper

@router.get("/papers", response_model=List[schemas.QuestionPaper])
def list_question_papers(
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    papers = db.query(models.QuestionPaper).filter(
        models.QuestionPaper.created_by_id == current_user.id
    ).order_by(models.QuestionPaper.created_at.desc()).all()
    # Attach mapping_count for each paper
    for p in papers:
        p.mapping_count = len(p.mappings)
    return papers

@router.get("/papers/{paper_id}", response_model=schemas.QuestionPaperDetail)
def get_question_paper(
    paper_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    paper = db.query(models.QuestionPaper).filter(
        models.QuestionPaper.id == paper_id,
        models.QuestionPaper.created_by_id == current_user.id
    ).first()
    
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")
        
    return paper

@router.delete("/papers/{paper_id}")
def delete_question_paper(
    paper_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    paper = db.query(models.QuestionPaper).filter(
        models.QuestionPaper.id == paper_id,
        models.QuestionPaper.created_by_id == current_user.id
    ).first()
    
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")
        
    db.delete(paper)
    db.commit()
    return {"ok": True}

@router.post("/papers/{paper_id}/map-question", response_model=schemas.PaperQuestionMappingDetail)
def map_question_to_paper(
    paper_id: int,
    mapping: schemas.PaperQuestionMappingCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    # Verify paper ownership
    paper = db.query(models.QuestionPaper).filter(
        models.QuestionPaper.id == paper_id,
        models.QuestionPaper.created_by_id == current_user.id
    ).first()

    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    # Enforce section limits (from paper.sections_config)
    try:
        sections = safe_json_parse(paper.sections_config)
        target_section = next((s for s in sections if s.get('name') == mapping.section_name), None)
        if target_section:
            limit = target_section.get('target_questions', 0)
            # Count how many questions are already in this section
            # (exclude the current question if it's already in this paper to allow re-ordering)
            current_count = db.query(models.PaperQuestionMapping).filter(
                models.PaperQuestionMapping.paper_id == paper_id,
                models.PaperQuestionMapping.section_name == mapping.section_name,
                models.PaperQuestionMapping.question_id != mapping.question_id
            ).count()
            
            if current_count >= limit:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Section {mapping.section_name} already has {limit} questions. Cannot add more."
                )
    except (json.JSONDecodeError, TypeError):
        # If config is corrupted, we skip limit check or log it
        pass
        
    # Check if this exact mapping already exists
    existing = db.query(models.PaperQuestionMapping).filter(
        models.PaperQuestionMapping.paper_id == paper_id,
        models.PaperQuestionMapping.question_id == mapping.question_id
    ).first()
    if existing:
        # Just update the section if it changed
        existing.section_name = mapping.section_name
        existing.order_in_section = mapping.order_in_section
        db.commit()
        db.refresh(existing)
        # Ensure question is loaded
        existing = db.query(models.PaperQuestionMapping).options(joinedload(models.PaperQuestionMapping.question)).filter(models.PaperQuestionMapping.id == existing.id).first()
        return existing

    new_map = models.PaperQuestionMapping(
        paper_id=paper_id,
        question_id=mapping.question_id,
        section_name=mapping.section_name,
        order_in_section=mapping.order_in_section
    )
    db.add(new_map)
    db.commit()
    db.refresh(new_map)
    # Ensure question is loaded
    new_map = db.query(models.PaperQuestionMapping).options(joinedload(models.PaperQuestionMapping.question)).filter(models.PaperQuestionMapping.id == new_map.id).first()
    return new_map

@router.delete("/papers/{paper_id}/map-question/{mapping_id}")
def delete_paper_question_mapping(
    paper_id: int,
    mapping_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    mapping = db.query(models.PaperQuestionMapping).join(
        models.QuestionPaper, models.PaperQuestionMapping.paper_id == models.QuestionPaper.id
    ).filter(
        models.PaperQuestionMapping.id == mapping_id,
        models.PaperQuestionMapping.paper_id == paper_id,
        models.QuestionPaper.created_by_id == current_user.id
    ).first()
    
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")
        
    db.delete(mapping)
    db.commit()
    return {"ok": True}

@router.post("/papers/{paper_id}/export")
def export_question_paper_pdf(
    paper_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    # Fetch paper and mappings
    paper = db.query(models.QuestionPaper).filter(
        models.QuestionPaper.id == paper_id,
        models.QuestionPaper.created_by_id == current_user.id
    ).first()
    
    if not paper:
        raise HTTPException(status_code=404, detail="Question paper not found")
        
    mappings = db.query(models.PaperQuestionMapping).filter(
        models.PaperQuestionMapping.paper_id == paper_id
    ).order_by(models.PaperQuestionMapping.section_name, models.PaperQuestionMapping.order_in_section).all()
    
    # Load question data
    question_ids = [m.question_id for m in mappings]
    questions = db.query(models.Question).filter(models.Question.id.in_(question_ids)).all()
    q_dict = {q.id: q for q in questions}
    
    # Group by section — parse sections_config from JSON string
    try:
        parsed_sections_config = safe_json_parse(paper.sections_config)
    except (Exception):
        parsed_sections_config = []
        
    sections_map = {}
    for sm in parsed_sections_config:
        sections_map[sm['name']] = []
        
    for m in mappings:
        if m.section_name not in sections_map:
            sections_map[m.section_name] = []
        q_obj = q_dict.get(m.question_id)
        if q_obj:
            opts = [{"text": o.text, "is_correct": o.is_correct} for o in q_obj.options]
            sections_map[m.section_name].append({
                "text": q_obj.text,
                "points": q_obj.points,
                "type": q_obj.question_type.value if q_obj.question_type else "SHORT_ANSWER",
                "options": opts,
                "media_url": q_obj.media_url
            })
            
    sections_data = [{"name": k, "questions": v} for k, v in sections_map.items()]
    
    # Parse general_instructions from JSON string if needed
    try:
        raw_instructions = paper.general_instructions or "[]"
        if isinstance(raw_instructions, str):
            general_instructions = json.loads(raw_instructions)
        else:
            general_instructions = raw_instructions
    except (json.JSONDecodeError, TypeError):
        general_instructions = []
    
    # Build Paper dict for the generator
    
    paper_data = {
        "school_name": "BRINYMIST SCHOOL",
        "exam_type": paper.exam_type,
        "academic_year": paper.academic_year,
        "grade": paper.grade,
        "subject": paper.subject,
        "duration": paper.duration,
        "set_number": paper.set_number,
        "total_marks": paper.total_marks,
        "general_instructions": general_instructions,
        "sections": sections_data
    }
    
    try:
        pdf_generator = CBSEPaperGenerator(paper_data)
        pdf_bytes = pdf_generator.generate_pdf()
        
        # Mark paper as complete after successful PDF generation
        paper.status = 'complete'
        db.commit()
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Question_Paper_{paper.id}.pdf"
            }
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")


# ────────────────────────────────────────────────────────────────
#  PAPER TEMPLATE ENDPOINTS
# ────────────────────────────────────────────────────────────────

import json as _json

def _can_edit_template(template: models.PaperTemplate, current_user: models.User) -> bool:
    """Owner or school-admin / super-admin can edit / delete."""
    if current_user.role in [models.UserRole.SCHOOL_ADMIN, models.UserRole.SUPER_ADMIN]:
        return True
    return template.created_by_id == current_user.id


@router.get("/templates", response_model=List[schemas.PaperTemplate])
def list_templates(
    visibility: Optional[str] = None,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher),
):
    """
    Return templates visible to the caller:
      - All 'system' templates
      - 'shared' templates created within the same school
      - Caller's own 'private' templates
    Optionally filter by visibility tab: 'system' | 'shared' | 'private' (my).
    """

    # Collect school-mate user IDs for 'shared' filter
    school_user_ids = db.query(models.User.id).filter(
        models.User.school_id == current_user.school_id
    ).subquery()

    base_filter = or_(
        models.PaperTemplate.visibility == "system",
        (models.PaperTemplate.visibility == "shared") & (models.PaperTemplate.created_by_id.in_(school_user_ids)),
        (models.PaperTemplate.visibility == "private") & (models.PaperTemplate.created_by_id == current_user.id),
    )

    query = db.query(models.PaperTemplate).filter(base_filter)

    # Optional tab-level filter
    if visibility == "system":
        query = db.query(models.PaperTemplate).filter(models.PaperTemplate.visibility == "system")
    elif visibility == "shared":
        query = db.query(models.PaperTemplate).filter(
            models.PaperTemplate.visibility == "shared",
            models.PaperTemplate.created_by_id.in_(school_user_ids),
        )
    elif visibility in ("private", "mine"):
        query = db.query(models.PaperTemplate).filter(
            models.PaperTemplate.visibility == "private",
            models.PaperTemplate.created_by_id == current_user.id,
        )

    return query.order_by(models.PaperTemplate.created_at.desc()).all()


@router.post("/templates", response_model=schemas.PaperTemplate)
def create_template(
    data: schemas.PaperTemplateCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher),
):
    """Create a new paper template."""
    # Only school admins / super admins can create 'system' templates
    if data.visibility == "system" and current_user.role not in [
        models.UserRole.SCHOOL_ADMIN, models.UserRole.SUPER_ADMIN
    ]:
        raise HTTPException(status_code=403, detail="Only admins can create system templates")

    tmpl = models.PaperTemplate(
        name=data.name,
        description=data.description,
        total_marks=data.total_marks,
        duration=data.duration,
        visibility=data.visibility or "private",
        sections_config=data.sections_config,
        general_instructions=data.general_instructions,
        created_by_id=current_user.id,
        created_by_role=current_user.role.value,
    )
    db.add(tmpl)
    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.get("/templates/{template_id}", response_model=schemas.PaperTemplate)
def get_template(
    template_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher),
):
    """Fetch a single template (must be visible to caller)."""
    school_user_ids = db.query(models.User.id).filter(
        models.User.school_id == current_user.school_id
    ).subquery()

    tmpl = db.query(models.PaperTemplate).filter(
        models.PaperTemplate.id == template_id,
        or_(
            models.PaperTemplate.visibility == "system",
            (models.PaperTemplate.visibility == "shared") & (models.PaperTemplate.created_by_id.in_(school_user_ids)),
            (models.PaperTemplate.visibility == "private") & (models.PaperTemplate.created_by_id == current_user.id),
        ),
    ).first()

    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    return tmpl


@router.put("/templates/{template_id}", response_model=schemas.PaperTemplate)
def update_template(
    template_id: int,
    data: schemas.PaperTemplateUpdate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher),
):
    """Update a template. Only owner or admin."""
    tmpl = db.query(models.PaperTemplate).filter(models.PaperTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if not _can_edit_template(tmpl, current_user):
        raise HTTPException(status_code=403, detail="Not authorised to edit this template")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(tmpl, field, value)

    db.commit()
    db.refresh(tmpl)
    return tmpl


@router.delete("/templates/{template_id}")
def delete_template(
    template_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher),
):
    """Delete a template. Only owner or admin."""
    tmpl = db.query(models.PaperTemplate).filter(models.PaperTemplate.id == template_id).first()
    if not tmpl:
        raise HTTPException(status_code=404, detail="Template not found")
    if tmpl.created_by_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the person who created this template can delete it")

    db.delete(tmpl)
    db.commit()
    return {"ok": True}


@router.post("/templates/{template_id}/clone", response_model=schemas.PaperTemplate)
def clone_template(
    template_id: int,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher),
):
    """
    Clone any visible template into a new private copy owned by the caller.
    The clone records cloned_from_id so the lineage is traceable.
    """
    school_user_ids = db.query(models.User.id).filter(
        models.User.school_id == current_user.school_id
    ).subquery()

    source = db.query(models.PaperTemplate).filter(
        models.PaperTemplate.id == template_id,
        or_(
            models.PaperTemplate.visibility == "system",
            (models.PaperTemplate.visibility == "shared") & (models.PaperTemplate.created_by_id.in_(school_user_ids)),
            (models.PaperTemplate.visibility == "private") & (models.PaperTemplate.created_by_id == current_user.id),
        ),
    ).first()

    if not source:
        raise HTTPException(status_code=404, detail="Template not found or not accessible")

    clone = models.PaperTemplate(
        name=f"{source.name} (Copy)",
        description=source.description,
        total_marks=source.total_marks,
        duration=source.duration,
        visibility="private",
        sections_config=source.sections_config,
        general_instructions=source.general_instructions,
        created_by_id=current_user.id,
        created_by_role=current_user.role.value,
        cloned_from_id=source.id,
    )
    db.add(clone)
    db.commit()
    db.refresh(clone)
    return clone

