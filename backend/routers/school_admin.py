from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import database, models, schemas, auth

router = APIRouter(
    prefix="/school-admin",
    tags=["school-admin"],
    responses={404: {"description": "Not found"}},
)

def get_current_school_admin(current_user: models.User = Depends(auth.get_current_active_user)):
    if current_user.role not in [models.UserRole.SCHOOL_ADMIN, models.UserRole.SUPER_ADMIN]:
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user


@router.post("/teachers/", response_model=schemas.User)
def create_teacher(user: schemas.UserCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    if not current_user.school_id:
        raise HTTPException(status_code=400, detail="Admin must belong to a school")
        
    existing_user = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role=models.UserRole.TEACHER,
        school_id=current_user.school_id,
        active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/teachers/", response_model=List[schemas.User])
def read_teachers(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    return db.query(models.User).filter(
        models.User.school_id == current_user.school_id,
        models.User.role == models.UserRole.TEACHER
    ).all()

@router.post("/classes/", response_model=schemas.Class)
def create_class(class_data: schemas.ClassCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    # Verify grade belongs to school
    grade = db.query(models.Grade).filter(
        models.Grade.id == class_data.grade_id,
        models.Grade.school_id == current_user.school_id
    ).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found in this school")
    
    # Verify teacher if provided
    if class_data.class_teacher_id:
        teacher = db.query(models.User).filter(
            models.User.id == class_data.class_teacher_id,
            models.User.school_id == current_user.school_id,
            models.User.role == models.UserRole.TEACHER
        ).first()
        if not teacher:
            raise HTTPException(status_code=404, detail="Teacher not found in this school")

    new_class = models.Class(
        name=class_data.name,
        section=class_data.section,
        grade_id=class_data.grade_id,
        school_id=current_user.school_id,
        class_teacher_id=class_data.class_teacher_id
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return new_class

@router.delete("/classes/{class_id}")
def delete_class(class_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    class_obj = db.query(models.Class).filter(
        models.Class.id == class_id,
        models.Class.school_id == current_user.school_id
    ).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found")
        
    db.delete(class_obj)
    db.commit()
    return {"message": "Class deleted successfully"}

@router.get("/classes/", response_model=List[schemas.Class])
def read_classes(grade_id: Optional[int] = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    query = db.query(models.Class).filter(models.Class.school_id == current_user.school_id)
    if grade_id:
        query = query.filter(models.Class.grade_id == grade_id)
    return query.all()

@router.post("/subjects/", response_model=schemas.Subject)
def create_subject(subject: schemas.SubjectCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    new_subject = models.Subject(
        name=subject.name,
        code=subject.code,
        school_id=current_user.school_id
    )
    db.add(new_subject)
    db.commit()
    db.refresh(new_subject)
    return new_subject

@router.get("/subjects/", response_model=List[schemas.Subject])
def read_subjects(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    print(f"DEBUG: read_subjects called by {current_user.username} (Role: {current_user.role}, SchoolID: {current_user.school_id})")
    subjects = db.query(models.Subject).filter(models.Subject.school_id == current_user.school_id).all()
    print(f"DEBUG: Found {len(subjects)} subjects for SchoolID {current_user.school_id}")
    return subjects

@router.delete("/subjects/{subject_id}")
def delete_subject(subject_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    subject = db.query(models.Subject).filter(
        models.Subject.id == subject_id,
        models.Subject.school_id == current_user.school_id
    ).first()
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
        
    # Check constraints
    if db.query(models.TeacherAssignment).filter(models.TeacherAssignment.subject_id == subject_id).first():
        raise HTTPException(status_code=400, detail="Cannot delete: Subject assigned to teachers")
        
    if db.query(models.Assignment).filter(models.Assignment.subject_id == subject_id).first():
        raise HTTPException(status_code=400, detail="Cannot delete: Subject has assignments")
        
    if db.query(models.FileArtifact).filter(models.FileArtifact.subject_id == subject_id).first():
        raise HTTPException(status_code=400, detail="Cannot delete: Subject has learning materials")

    db.delete(subject)
    db.commit()
    return {"message": "Subject deleted successfully"}

@router.post("/grades/", response_model=schemas.Grade)
def create_grade(grade: schemas.GradeCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    new_grade = models.Grade(
        name=grade.name,
        school_id=current_user.school_id
    )
    db.add(new_grade)
    db.commit()
    db.refresh(new_grade)
    return new_grade

@router.get("/grades/", response_model=List[schemas.Grade])
def read_grades(db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    return db.query(models.Grade).filter(models.Grade.school_id == current_user.school_id).all()

@router.put("/classes/{class_id}/teacher/{teacher_id}")
def assign_class_teacher(class_id: int, teacher_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    # Verify class exists and belongs to school
    class_obj = db.query(models.Class).filter(
        models.Class.id == class_id,
        models.Class.school_id == current_user.school_id
    ).first()
    if not class_obj:
        raise HTTPException(status_code=404, detail="Class not found in this school")
    
    # Verify teacher exists and belongs to school
    teacher = db.query(models.User).filter(
        models.User.id == teacher_id,
        models.User.school_id == current_user.school_id,
        models.User.role == models.UserRole.TEACHER
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found in this school")
        
    class_obj.class_teacher_id = teacher_id
    db.commit()
    return {"message": "Teacher assigned to class successfully"}

@router.get("/students/", response_model=List[schemas.Student])
def read_students(grade_id: int = None, class_id: int = None, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    query = db.query(models.Student).filter(models.Student.school_id == current_user.school_id)
    
    if class_id:
        query = query.filter(models.Student.class_id == class_id)
        
    students = query.all()
    # Populate email from linked user for the schema
    for s in students:
        if s.user:
            s.email = s.user.email
    return students

@router.put("/students/{student_id}", response_model=schemas.Student)
def update_student(student_id: int, student_data: schemas.StudentUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    student = db.query(models.Student).filter(
        models.Student.id == student_id,
        models.Student.school_id == current_user.school_id
    ).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Validation
    if student_data.grade_id is not None:
        grade = db.query(models.Grade).filter(models.Grade.id == student_data.grade_id, models.Grade.school_id == current_user.school_id).first()
        if not grade:
            raise HTTPException(status_code=404, detail="Grade not found")
            
    if student_data.class_id is not None:
        # If class_id is 0 or -1 (if specific logic needed), but here assuming ID or Null.
        # If user wants to delete class, they might send null. Pydantic handles null if Optional? 
        # But if specifically sent as field. Pydantic exclude_unset handles omitted, but if sent as None it's included.
        class_obj = db.query(models.Class).filter(models.Class.id == student_data.class_id, models.Class.school_id == current_user.school_id).first()
        if not class_obj:
            raise HTTPException(status_code=404, detail="Class not found")
            
    # Update fields
    # Using exclude_unset to only update provided fields. 
    # To clear class_id, client must send class_id: null.
    
    update_data = student_data.model_dump(exclude_unset=True)
    
    # Handle email update (on User object)
    if "email" in update_data:
        email = update_data.pop("email")
        if student.user:
            student.user.email = email
            # Also, if we want to update username? Not requested yet.
            
    for key, value in update_data.items():
        setattr(student, key, value)
    
    db.commit()
    db.refresh(student)
    db.refresh(student)
    return student

@router.post("/students/", response_model=schemas.Student)
def create_student(student_data: schemas.StudentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    # 1. Validation
    grade = db.query(models.Grade).filter(models.Grade.id == student_data.grade_id, models.Grade.school_id == current_user.school_id).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
        
    if student_data.class_id:
        cls = db.query(models.Class).filter(models.Class.id == student_data.class_id, models.Class.school_id == current_user.school_id).first()
        if not cls:
            raise HTTPException(status_code=404, detail="Class not found")

    # 2. Username Generation
    # Logic: First Name + First Char of Last Name. Lowercase to be standard.
    parts = student_data.name.strip().split()
    if len(parts) >= 2:
        # e.g. "John Doe" -> "johnd"
        base_username = f"{parts[0]}{parts[-1][0]}".lower()
    else:
        # e.g. "Cher" -> "cher"
        base_username = parts[0].lower()
    
    # Ensure simplified alphanumeric? (Optional but good practice, doing minimal to satisfy req)
    base_username = "".join(c for c in base_username if c.isalnum())
    
    username = base_username
    counter = 1
    
    # Check uniqueness
    while db.query(models.User).filter(models.User.username == username).first():
        username = f"{base_username}{counter}"
        counter += 1
        
    # 3. Create User
    # Default password 'password123'
    hashed_password = auth.get_password_hash("password123")
    
    new_user = models.User(
        username=username,
        email=student_data.email, # Saved in User table
        hashed_password=hashed_password, 
        role=models.UserRole.STUDENT,
        school_id=current_user.school_id,
        active=True
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 4. Create Student
    new_student = models.Student(
        name=student_data.name,
        school_id=current_user.school_id,
        grade_id=student_data.grade_id,
        class_id=student_data.class_id,
        user_id=new_user.id,
        active=True
    )
    db.add(new_student)
    db.commit()
    db.refresh(new_student)
    
    return new_student

# --- Teacher Assignments ---

@router.get("/teachers/{teacher_id}/assignments", response_model=List[schemas.TeacherAssignment])
def read_teacher_assignments(teacher_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    # Verify teacher in school
    teacher = db.query(models.User).filter(
        models.User.id == teacher_id,
        models.User.school_id == current_user.school_id,
        models.User.role == models.UserRole.TEACHER
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")
        
    return db.query(models.TeacherAssignment).filter(models.TeacherAssignment.teacher_id == teacher_id).all()

@router.post("/teachers/{teacher_id}/assignments", response_model=schemas.TeacherAssignment)
def create_teacher_assignment(teacher_id: int, assignment: schemas.TeacherAssignmentCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    # Verify teacher
    teacher = db.query(models.User).filter(
        models.User.id == teacher_id,
        models.User.school_id == current_user.school_id,
        models.User.role == models.UserRole.TEACHER
    ).first()
    if not teacher:
        raise HTTPException(status_code=404, detail="Teacher not found")

    # Verify duplicates? (Optional but good)
    existing = db.query(models.TeacherAssignment).filter(
        models.TeacherAssignment.teacher_id == teacher_id,
        models.TeacherAssignment.subject_id == assignment.subject_id,
        models.TeacherAssignment.grade_id == assignment.grade_id,
        models.TeacherAssignment.class_id == assignment.class_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Assignment already exists")

    new_assignment = models.TeacherAssignment(
        teacher_id=teacher_id,
        subject_id=assignment.subject_id,
        grade_id=assignment.grade_id,
        class_id=assignment.class_id
    )
    db.add(new_assignment)
    db.commit()
    db.refresh(new_assignment)
    return new_assignment

@router.delete("/assignments/{assignment_id}")
def delete_teacher_assignment(assignment_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    assignment = db.query(models.TeacherAssignment).join(models.User).filter(
        models.TeacherAssignment.id == assignment_id,
        models.User.school_id == current_user.school_id # Ensure teacher belongs to admin's school
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
        
    db.delete(assignment)
    db.commit()
    return {"message": "Assignment deleted"}

# --- Grade-Subject Management ---

@router.get("/grades/{grade_id}/subjects", response_model=List[schemas.Subject])
def read_grade_subjects(grade_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    grade = db.query(models.Grade).filter(
        models.Grade.id == grade_id, 
        models.Grade.school_id == current_user.school_id
    ).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
        
    return grade.subjects

@router.post("/grades/{grade_id}/subjects", response_model=List[schemas.Subject])
def update_grade_subjects(grade_id: int, subject_data: schemas.GradeSubjectUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(get_current_school_admin)):
    grade = db.query(models.Grade).filter(
        models.Grade.id == grade_id, 
        models.Grade.school_id == current_user.school_id
    ).first()
    if not grade:
        raise HTTPException(status_code=404, detail="Grade not found")
    
    # Verify all subjects belong to the school
    subjects = db.query(models.Subject).filter(
        models.Subject.id.in_(subject_data.subject_ids),
        models.Subject.school_id == current_user.school_id
    ).all()
    
    if len(subjects) != len(subject_data.subject_ids):
        raise HTTPException(status_code=400, detail="One or more subjects not found or do not belong to this school")
        
    grade.subjects = subjects
    db.commit()
    return grade.subjects

