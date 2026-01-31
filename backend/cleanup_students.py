from sqlalchemy.orm import Session
from database import SessionLocal
import models

db: Session = SessionLocal()

def cleanup_students():
    print("Cleaning up students with invalid or inaccessible classes...")
    
    # Inaccessible classes for teacher1
    teacher = db.query(models.User).filter(models.User.username == "teacher1").first()
    if not teacher:
        return

    # Get allowed classes for teacher1
    visible_classes = db.query(models.Class).join(
        models.TeacherAssignment, 
        (models.TeacherAssignment.class_id == models.Class.id) | 
        ((models.TeacherAssignment.class_id == None) & (models.TeacherAssignment.grade_id == models.Class.grade_id))
    ).filter(
        models.TeacherAssignment.teacher_id == teacher.id
    ).distinct().all()
    
    visible_class_ids = [c.id for c in visible_classes]
    print(f"Teacher1 Visible Class IDs: {visible_class_ids}")

    # Find students in teacher's SCHOOL but NOT in visible classes
    # (Assuming we only want to manage students relevant to this teacher in this context)
    # Be careful: strictly deleting students might be too aggressive if they belong to other teachers.
    # But for this test/seeding context, the User request is "remove those data".
    
    students_to_remove = db.query(models.Student).filter(
        models.Student.school_id == teacher.school_id,
        models.Student.class_id.notin_(visible_class_ids)
    ).all()
    
    if not students_to_remove:
        print("No students to remove.")
        return

    print(f"Found {len(students_to_remove)} students to remove.")
    for s in students_to_remove:
        print(f"Deleting Student ID: {s.id} ('{s.name}') - Class {s.class_id}")
        db.delete(s)

    db.commit()
    print("Cleanup complete.")

if __name__ == "__main__":
    cleanup_students()
