from sqlalchemy.orm import Session
from database import SessionLocal
from app import models

db: Session = SessionLocal()

def verify_teacher_classes():
    teacher = db.query(models.User).filter(models.User.username == "teacher1").first()
    if not teacher:
        print("Teacher1 not found")
        return

    print(f"Teacher: {teacher.username} (ID: {teacher.id})")

    # Mimic the router query exactly
    classes = db.query(models.Class).join(
        models.TeacherAssignment, 
        (models.TeacherAssignment.class_id == models.Class.id) | 
        ((models.TeacherAssignment.class_id == None) & (models.TeacherAssignment.grade_id == models.Class.grade_id))
    ).filter(
        models.TeacherAssignment.teacher_id == teacher.id
    ).distinct().all()

    print(f"Visible Classes Count: {len(classes)}")
    for c in classes:
        print(f"Class ID: {c.id}, Name: {c.name}, Section: {c.section}")

    # Also check assignments
    assignments = db.query(models.Assignment).filter(models.Assignment.teacher_id == teacher.id).all()
    print(f"\n assignments Count: {len(assignments)}")
    for a in assignments:
        print(f"Assignment ID: {a.id}, Title: {a.title}, ClassID: {a.class_id}")
        if a.class_id and not any(c.id == a.class_id for c in classes):
            print(f"  >>> WARNING: Assignment linked to Class ID {a.class_id} which is NOT in visible list!")

if __name__ == "__main__":
    verify_teacher_classes()
