from sqlalchemy.orm import Session
from database import SessionLocal
import models
import schemas

db: Session = SessionLocal()

def cleanup_assignments():
    print("Cleaning up assignments with invalid or inaccessible classes...")
    
    # 1. Null class_id
    invalid_assignments = db.query(models.Assignment).filter(models.Assignment.class_id == None).all()
    if invalid_assignments:
        print(f"Found {len(invalid_assignments)} assignments with NULL class_id. Deleting...")
        for a in invalid_assignments:
             db.delete(a)
        db.commit()
    
    # 2. Inaccessible classes for teacher1
    teacher = db.query(models.User).filter(models.User.username == "teacher1").first()
    if not teacher:
        return

    # Get allowed classes for teacher1 (Logic must match routers/teacher.py)
    visible_classes = db.query(models.Class).join(
        models.TeacherAssignment, 
        (models.TeacherAssignment.class_id == models.Class.id) | 
        ((models.TeacherAssignment.class_id == None) & (models.TeacherAssignment.grade_id == models.Class.grade_id))
    ).filter(
        models.TeacherAssignment.teacher_id == teacher.id
    ).distinct().all()
    
    visible_class_ids = [c.id for c in visible_classes]
    print(f"Teacher1 Visible Class IDs: {visible_class_ids}")

    # Find assignments by teacher1 where class_id is NOT in visible_class_ids
    teacher_assignments = db.query(models.Assignment).filter(models.Assignment.teacher_id == teacher.id).all()
    
    for a in teacher_assignments:
        if a.class_id and a.class_id not in visible_class_ids:
            print(f"Deleting Assignment ID: {a.id} ('{a.title}') - Linked to Class {a.class_id} (Not visible)")
            db.delete(a)

    db.commit()
    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_assignments()
