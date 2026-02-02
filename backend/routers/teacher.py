from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import database, models, schemas, auth
from services import rag_service

router = APIRouter(
    prefix="/teacher",
    tags=["teacher"],
    responses={404: {"description": "Not found"}},
)

def get_current_teacher(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role not in [models.UserRole.TEACHER, models.UserRole.SCHOOL_ADMIN, models.UserRole.SUPER_ADMIN]:
         raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


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

    new_student = models.Student(
        name=student.name,
        grade_id=student.grade_id,
        class_id=student.class_id,
        school_id=current_user.school_id,
        active=True
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    return new_student

@router.get("/students/", response_model=List[schemas.Student])
def read_students(class_id: int = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # Get visible class IDs first
    visible_classes = db.query(models.Class.id).join(
        models.TeacherAssignment, 
        (models.TeacherAssignment.class_id == models.Class.id) | 
        ((models.TeacherAssignment.class_id == None) & (models.TeacherAssignment.grade_id == models.Class.grade_id))
    ).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    ).distinct().all()
    
    visible_class_ids = [c[0] for c in visible_classes] # Unpack tuples

    query = db.query(models.Student).filter(
        models.Student.school_id == current_user.school_id,
        models.Student.class_id.in_(visible_class_ids)
    )
    
    if class_id:
        if class_id not in visible_class_ids:
             # If asking for a specific class that isn't visible, return empty or error? Empty is safer.
             return []
        query = query.filter(models.Student.class_id == class_id)
        
        query = query.filter(models.Student.class_id == class_id)
        
    return query.all()

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
    # Verify class belongs to school
    class_obj = db.query(models.Class).filter(
        models.Class.id == assignment.assigned_to_class_id,
        models.Class.school_id == current_user.school_id
    ).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
        
    new_assignment = models.Assignment(
        title=assignment.title,
        description=assignment.description,
        due_date=assignment.due_date,
        status=assignment.status,
        teacher_id=current_user.id,
        class_id=assignment.assigned_to_class_id,
        subject_id=assignment.subject_id
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment

@router.get("/assignments/", response_model=List[schemas.Assignment])
def read_assignments(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    return db.query(models.Assignment).filter(models.Assignment.teacher_id == current_user.id).all()

@router.post("/assignments/ai-generate", response_model=schemas.Assignment)
async def generate_ai_assignment(topic: str, grade_level: str, difficulty: str, question_count: int, subject_id: int, class_id: int, due_date: datetime = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    # 1. Get Subject Name for RAG Context
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    subject_name = subject.name if subject else "General Knowledge"

    # 2. Call RAG Service
    print(f"Generating quiz for {subject_name} - {topic}")
    generated_questions = await rag_service.generate_quiz_questions(
        topic=topic,
        subject_name=subject_name,
        grade_level=grade_level,
        difficulty=difficulty,
        count=question_count
    )

    if not generated_questions:
        raise HTTPException(status_code=500, detail="AI generation failed or returned no questions.")

    # 3. Create Assignment
    title = f"Quiz: {topic}"
    description = f"A {difficulty} level quiz about {topic}. Generated by AI."
    
    new_assignment = models.Assignment(
        title=title,
        description=description,
        status=models.AssignmentStatus.DRAFT,
        teacher_id=current_user.id,
        due_date=due_date,
        subject_id=subject_id,
        class_id=class_id
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)

    # 4. Create Questions
    for q_data in generated_questions:
        # Map Type
        q_type_str = q_data.get("question_type", "MULTIPLE_CHOICE")
        try:
            q_type = models.QuestionType(q_type_str)
        except:
            q_type = models.QuestionType.MULTIPLE_CHOICE
            
        new_q = models.Question(
            text=q_data.get("text", "Question Text"),
            points=q_data.get("points", 5),
            question_type=q_type,
            assignment_id=new_assignment.id
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
    return db.query(models.Subject).join(models.TeacherAssignment).filter(
        models.TeacherAssignment.teacher_id == current_user.id
    ).distinct().all()

@router.get("/grades/", response_model=List[schemas.Grade])
def read_grades(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
    return db.query(models.Grade).filter(models.Grade.school_id == current_user.school_id).all()

# --- Question Endpoints ---

@router.get("/assignments/{assignment_id}/questions", response_model=List[schemas.Question])
def read_questions(assignment_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_teacher)):
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

