from sqlalchemy.orm import Session
from database import SessionLocal
import models

db: Session = SessionLocal()

def debug_assignments():
    teacher = db.query(models.User).filter(models.User.username == "teacher1").first()
    if not teacher:
        print("Teacher1 not found")
        return

    print(f"Checking assignments for teacher: {teacher.username} (ID: {teacher.id})")
    
    # Get all assignments for this teacher
    assignments = db.query(models.Assignment).filter(models.Assignment.teacher_id == teacher.id).all()
    print(f"Found {len(assignments)} assignments.")

    # Get all classes in DB
    all_classes = {c.id: c for c in db.query(models.Class).all()}
    
    # Get classes assigned to teacher
    assigned_classes_ids = []
    # Logic from router.read_classes
    # Explicit assignments
    t_assigns = db.query(models.TeacherAssignment).filter(models.TeacherAssignment.teacher_id == teacher.id).all()
    for ta in t_assigns:
        if ta.class_id:
            assigned_classes_ids.append(ta.class_id)
        elif ta.grade_id:
            # All classes in grade
            grade_classes = db.query(models.Class).filter(models.Class.grade_id == ta.grade_id).all()
            assigned_classes_ids.extend([c.id for c in grade_classes])
    
    assigned_classes_ids = list(set(assigned_classes_ids))
    print(f"Teacher is assigned to Class IDs: {assigned_classes_ids}")

    print("\n--- Assignment Details ---")
    for a in assignments:
        status = "OK"
        issue = ""
        c_name = "None"
        
        if a.class_id is None:
            status = "INVALID"
            issue = "class_id is None"
        elif a.class_id not in all_classes:
            status = "INVALID"
            issue = f"class_id {a.class_id} does not exist in classes table"
        elif a.class_id not in assigned_classes_ids:
            status = "WARNING"
            c_name = all_classes[a.class_id].name
            issue = f"Class {c_name} (ID: {a.class_id}) exists but NOT assigned to teacher"
        else:
            c_name = all_classes[a.class_id].name
        
        print(f"[{status}] ID: {a.id}, Title: '{a.title}', ClassID: {a.class_id} ({c_name}) | {issue}")

if __name__ == "__main__":
    debug_assignments()
