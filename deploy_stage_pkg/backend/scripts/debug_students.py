from sqlalchemy.orm import Session
from database import SessionLocal
from app import models

db: Session = SessionLocal()

def debug_students():
    teacher = db.query(models.User).filter(models.User.username == "teacher1").first()
    if not teacher:
        print("Teacher1 not found")
        return

    print(f"Checking students for teacher's school: {teacher.school_id}")
    
    # Get all students in school
    students = db.query(models.Student).filter(models.Student.school_id == teacher.school_id).all()
    print(f"Total Students in School: {len(students)}")

    # Get teacher's visible classes
    visible_classes = db.query(models.Class).join(
        models.TeacherAssignment, 
        (models.TeacherAssignment.class_id == models.Class.id) | 
        ((models.TeacherAssignment.class_id == None) & (models.TeacherAssignment.grade_id == models.Class.grade_id))
    ).filter(
        models.TeacherAssignment.teacher_id == teacher.id
    ).distinct().all()
    
    visible_class_ids = [c.id for c in visible_classes]
    print(f"Teacher Visible Class IDs: {visible_class_ids}")

    print("\n--- Student Details ---")
    for s in students:
        status = "OK"
        issue = ""
        c_name = "None"
        
        if s.class_id is None:
            status = "INVALID"
            issue = "class_id is None"
        elif s.class_id not in visible_class_ids:
            status = "WARNING"
            c = db.query(models.Class).filter(models.Class.id == s.class_id).first()
            c_name = c.name if c else "UnknownID"
            issue = f"Class {c_name} (ID: {s.class_id}) exists but NOT assigned to teacher"
        else:
            c = db.query(models.Class).filter(models.Class.id == s.class_id).first()
            c_name = c.name if c else "Unknown"
        
        print(f"[{status}] ID: {s.id}, Name: '{s.name}', ClassID: {s.class_id} ({c_name}) | {issue}")

if __name__ == "__main__":
    debug_students()
