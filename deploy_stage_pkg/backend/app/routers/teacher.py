from fastapi import APIRouter, Depends, HTTPException
import logging

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
from app import database
from app import models
from app import schemas
from app import auth
from app.services import rag_service
from app.config import settings

router = APIRouter(
    prefix="/teacher",
    tags=["teacher"],
    responses={404: {"description": "Not found"}},
)

logger = logging.getLogger(__name__)

def get_current_teacher(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role not in [models.UserRole.TEACHER, models.UserRole.SCHOOL_ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


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

    # 1. Username Generation
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
    hashed_password = auth.get_password_hash("password123")
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

    # 4. Auto-assign existing published assignments as PENDING
    published_assignments = db.query(models.Assignment).filter(
        models.Assignment.status == models.AssignmentStatus.PUBLISHED,
        (models.Assignment.class_id == new_student.class_id) | 
        ((models.Assignment.class_id == None) & (models.Assignment.grade_id == new_student.grade_id))
    ).all()
    for assignment in published_assignments:
        new_sub = models.Submission(
            assignment_id=assignment.id,
            student_id=new_student.id,
            status=models.SubmissionStatus.PENDING
        )
        db.add(new_sub)
    db.commit()

    return new_student

@router.get("/students/", response_model=schemas.PaginatedResponse[schemas.StudentWithMetrics])
def read_students(
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
    
    # Get visible class IDs from both tables
    visible_classes_ta = db.query(models.Class.id).join(
        models.TeacherAssignment, 
        (models.TeacherAssignment.class_id == models.Class.id) | 
        ((models.TeacherAssignment.class_id == None) & (models.TeacherAssignment.grade_id == models.Class.grade_id))
    ).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    ).distinct().all()
    
    visible_classes_ct = db.query(models.Class.id).filter(
        models.Class.class_teacher_id == current_user.id
    ).distinct().all()
    
    visible_class_ids = list(set([c[0] for c in visible_classes_ta] + [c[0] for c in visible_classes_ct]))
    
    # Also include grade IDs to see students not yet in a class
    visible_grade_ids_ta = db.query(models.TeacherAssignment.grade_id).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    ).distinct().all()
    
    visible_grade_ids_ct = db.query(models.Class.grade_id).filter(
        models.Class.class_teacher_id == current_user.id
    ).distinct().all()

    visible_grade_ids = list(set([g[0] for g in visible_grade_ids_ta] + [g[0] for g in visible_grade_ids_ct]))

    query = db.query(models.Student).filter(
        models.Student.school_id == current_user.school_id,
        (models.Student.class_id.in_(visible_class_ids)) |
        ((models.Student.class_id == None) & (models.Student.grade_id.in_(visible_grade_ids)))
    )
    
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

    # 1. Submissions count per student directly from the database status groups
    submissions = db.query(
        models.Submission.student_id,
        models.Submission.status,
        func.count(models.Submission.id)
    ).join(models.Assignment).filter(
        models.Submission.student_id.in_(student_ids),
        models.Assignment.teacher_id == current_user.id
    ).group_by(models.Submission.student_id, models.Submission.status).all()
    
    sub_map = {}
    for sid, status, count in submissions:
        if sid not in sub_map:
            sub_map[sid] = {"pending": 0, "completed": 0, "graded": 0}
        if status == models.SubmissionStatus.PENDING:
            sub_map[sid]["pending"] += count
        elif status == models.SubmissionStatus.SUBMITTED:
            sub_map[sid]["completed"] += count
        elif status == models.SubmissionStatus.GRADED:
            sub_map[sid]["graded"] += count
            # Often UI considers graded as also completed historically, check if UI still needs it
            sub_map[sid]["completed"] += count

    student_metrics = []
    for s in students:
        pending = sub_map.get(s.id, {}).get("pending", 0)
        completed = sub_map.get(s.id, {}).get("completed", 0)
        graded = sub_map.get(s.id, {}).get("graded", 0)
        
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
            "assigned_count": pending,
            "completed_count": completed,
            "graded_count": graded
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
    return db.query(models.Assignment).filter(models.Assignment.teacher_id == current_user.id).all()

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
            use_pdf_context=req.use_pdf_context
        )
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
        question_type=getattr(req, 'question_type', "Mixed") or "Mixed"
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
            points=q_data.get("points", 5),
            question_type=q_type,
            assignment_id=new_assignment.id,
            school_id=current_user.school_id,
            subject_id=req.subject_id,
            # grade_id=req.grade_id, # If model has grade_id
            difficulty_level=req.difficulty
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

@router.post("/assignments/from-bank", response_model=schemas.AssignmentOut)
def create_assignment_from_bank(
    data: schemas.AssignmentFromBankCreate,
    db: Session = Depends(database.get_db),
    current_user: models.User = Depends(get_current_teacher)
):
    # Support both grade_id (new) and class_id (legacy)
    class_or_grade_id = data.grade_id or data.class_id
    
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
        question_type="Mixed"
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
            parent_question_id=q.id     # Link to parent
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
    
    # Auto-assign PENDING submissions to all eligible students
    # First get all classes this teacher has access to (either explicitly or as class teacher)
    visible_classes_ta = db.query(models.Class.id).join(
        models.TeacherAssignment,
        (models.TeacherAssignment.class_id == models.Class.id) |
        ((models.TeacherAssignment.class_id == None) & (models.TeacherAssignment.grade_id == models.Class.grade_id))
    ).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    ).distinct().all()

    visible_classes_ct = db.query(models.Class.id).filter(
        models.Class.class_teacher_id == current_user.id
    ).distinct().all()

    visible_class_ids = list(set([c[0] for c in visible_classes_ta] + [c[0] for c in visible_classes_ct]))

    visible_grade_ids_ta = db.query(models.TeacherAssignment.grade_id).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    ).distinct().all()

    visible_grade_ids_ct = db.query(models.Class.grade_id).filter(
        models.Class.class_teacher_id == current_user.id
    ).distinct().all()
    
    visible_grade_ids = list(set([g[0] for g in visible_grade_ids_ta] + [g[0] for g in visible_grade_ids_ct]))

    # Now find all students who match the assignment's context AND the teacher's visibility
    student_query = db.query(models.Student).filter(
        models.Student.school_id == current_user.school_id,
        (models.Student.class_id.in_(visible_class_ids)) |
        ((models.Student.class_id == None) & (models.Student.grade_id.in_(visible_grade_ids)))
    )

    if assignment.class_id:
        student_query = student_query.filter(models.Student.class_id == assignment.class_id)
    elif assignment.grade_id:
        student_query = student_query.filter(models.Student.grade_id == assignment.grade_id)
        
    students = student_query.all()
        
    for student in students:
        # Check if they already have one (just in case)
        existing = db.query(models.Submission).filter(
            models.Submission.assignment_id == assignment.id,
            models.Submission.student_id == student.id
        ).first()
        if not existing:
            new_sub = models.Submission(
                assignment_id=assignment.id,
                student_id=student.id,
                status=models.SubmissionStatus.PENDING
            )
            db.add(new_sub)

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

@router.get("/questions/", response_model=List[schemas.QuestionOut])
def read_questions(
    subject_id: Optional[int] = None, 
    class_id: Optional[int] = None, 
    difficulty: Optional[str] = None, 
    search: Optional[str] = None,
    db: Session = Depends(database.get_db), 
    current_user: models.User = Depends(get_current_teacher)
):
    """
    Get all questions for the current teacher with optional filters.
    Used for question bank browsing and filtering.
    """
    query = db.query(models.Question).join(models.Assignment, models.Question.assignment_id == models.Assignment.id)
    
    # Filter by Teacher (security)
    query = query.filter(models.Assignment.teacher_id == current_user.id)
    
    # Exclude derived questions (only show originals)
    query = query.filter(models.Question.parent_question_id == None)
    
    # Context Filters (populated in models now)
    if class_id:
        query = query.filter(models.Question.class_id == class_id)
    if subject_id:
        query = query.filter(models.Question.subject_id == subject_id)
        
    # Optional Filters
    if difficulty:
        query = query.filter(models.Question.difficulty_level == difficulty)
         
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(models.Question.text.ilike(search_fmt))
        
    return query.all()

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
    explicit_classes = db.query(models.Class).join(
        models.TeacherAssignment, 
        (models.TeacherAssignment.class_id == models.Class.id) | 
        ((models.TeacherAssignment.class_id == None) & (models.TeacherAssignment.grade_id == models.Class.grade_id))
    ).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    )
    
    class_teacher_classes = db.query(models.Class).filter(
        models.Class.class_teacher_id == current_user.id
    )
    
    return explicit_classes.union(class_teacher_classes).all()

@router.get("/subjects/", response_model=List[schemas.Subject])
@router.get("/subjects/", response_model=List[schemas.Subject])
def read_subjects(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # Get distinct subject IDs assigned to this teacher
    assigned_subject_ids = db.query(models.TeacherAssignment.subject_id).filter(
        models.TeacherAssignment.teacher_id == current_user.id,
        models.TeacherAssignment.subject_id.isnot(None)
    ).distinct().all()
    
    # Flatten the list of tuples
    subject_ids = [s[0] for s in assigned_subject_ids]
    
    if not subject_ids:
        return []
        
    # Query and return the actual Subject models
    return db.query(models.Subject).filter(models.Subject.id.in_(subject_ids)).all()

@router.get("/grades/", response_model=List[schemas.Grade])
def read_grades(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    explicit_grades = db.query(models.Grade).join(
        models.TeacherAssignment,
        models.TeacherAssignment.grade_id == models.Grade.id
    ).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    )
    
    class_teacher_grades = db.query(models.Grade).join(
        models.Class,
        models.Class.grade_id == models.Grade.id
    ).filter(
        models.Class.class_teacher_id == current_user.id
    )
    
    return explicit_grades.union(class_teacher_grades).all()

# --- Question Endpoints ---

@router.get("/assignments/{assignment_id}/questions", response_model=List[schemas.Question])
def read_assignment_questions(assignment_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
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
def create_question(assignment_id: int, question: schemas.QuestionCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
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
        assignment_id=assignment_id
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
def update_question(question_id: int, question_update: schemas.QuestionUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
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
def delete_question(question_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    question = db.query(models.Question).join(models.Assignment).filter(
        models.Question.id == question_id,
        models.Assignment.teacher_id == current_user.id
    ).first()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    db.delete(question)
    db.commit()
    return {"ok": True}

@router.post("/assignments/{assignment_id}/seed_questions")
def seed_sample_questions(assignment_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # Helper to generate sample data as requested
    assignment = db.query(models.Assignment).filter(
        models.Assignment.id == assignment_id,
        models.Assignment.teacher_id == current_user.id
    ).first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")

    # 1. Multiple Choice
    q1 = models.Question(
        text="What is the capital of France?",
        question_type=models.QuestionType.MULTIPLE_CHOICE,
        points=5,
        assignment_id=assignment_id
    )
    db.add(q1)
    db.commit() # get ID
    
    db.add(models.QuestionOption(text="London", is_correct=False, question_id=q1.id))
    db.add(models.QuestionOption(text="Berlin", is_correct=False, question_id=q1.id))
    db.add(models.QuestionOption(text="Paris", is_correct=True, question_id=q1.id))
    db.add(models.QuestionOption(text="Madrid", is_correct=False, question_id=q1.id))

    # 2. True/False
    q2 = models.Question(
        text="The Earth is flat.",
        question_type=models.QuestionType.TRUE_FALSE,
        points=5,
        assignment_id=assignment_id
    )
    db.add(q2)
    db.commit()
    
    db.add(models.QuestionOption(text="True", is_correct=False, question_id=q2.id))
    db.add(models.QuestionOption(text="False", is_correct=True, question_id=q2.id))

    # 3. Short Answer
    q3 = models.Question(
        text="Who wrote 'Hamlet'?",
        question_type=models.QuestionType.SHORT_ANSWER,
        points=10,
        assignment_id=assignment_id
    )
    db.add(q3)
    # Short answer might verify text differently (e.g. check against option text as exact match), 
    # but for now let's store expected answer as is_correct=True option
    db.add(models.QuestionOption(text="William Shakespeare", is_correct=True, question_id=q3.id))

    db.commit()
    return {"message": "Sample questions added"}


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

    # Get all submissions (PENDING, SUBMITTED, GRADED) for this student for assignments from this teacher
    submissions = db.query(models.Submission).join(models.Assignment).filter(
        models.Submission.student_id == student_id,
        models.Assignment.teacher_id == current_user.id,
        models.Assignment.status == models.AssignmentStatus.PUBLISHED
    ).all()
    
    overview_items = []
    for sub in submissions:
        has_questions = len(sub.assignment.questions) > 0
        overview_items.append(schemas.GradingOverviewItem(
            assignment=sub.assignment,
            submission=sub,
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

    return schemas.DashboardStats(
        total_students=total_students,
        total_classes=len(classes),
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

