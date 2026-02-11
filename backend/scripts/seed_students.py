from sqlalchemy.orm import Session
from database import SessionLocal, engine
from app import models

db: Session = SessionLocal()

def seed_students():
    print("Seeding Students for Grading Test...")
    
    # 1. Find teacher1's school
    teacher = db.query(models.User).filter(models.User.username == "teacher1").first()
    if not teacher:
        print("Error: teacher1 not found.")
        return

    # 2. Find Classes 10 A and 10 B
    class_10a = db.query(models.Class).filter(models.Class.name == "10 A", models.Class.school_id == teacher.school_id).first()
    class_10b = db.query(models.Class).filter(models.Class.name == "10 B", models.Class.school_id == teacher.school_id).first()

    if not class_10a or not class_10b:
        print("Error: Classes not found. Run seed_classes.py first.")
        return

    # 3. Create Students
    # 3 students in 10 A, 2 in 10 B
    students_data = [
        {"name": "Alice Johnson", "class_id": class_10a.id, "grade_id": class_10a.grade_id},
        {"name": "Bob Smith", "class_id": class_10a.id, "grade_id": class_10a.grade_id},
        {"name": "Charlie Brown", "class_id": class_10a.id, "grade_id": class_10a.grade_id},
        {"name": "David Lee", "class_id": class_10b.id, "grade_id": class_10b.grade_id},
        {"name": "Eva Green", "class_id": class_10b.id, "grade_id": class_10b.grade_id},
    ]

    count = 0
    for s_data in students_data:
        exists = db.query(models.Student).filter(
            models.Student.name == s_data["name"],
            models.Student.school_id == teacher.school_id
        ).first()

        if not exists:
            print(f"Creating student: {s_data['name']}...")
            student = models.Student(
                name=s_data["name"],
                class_id=s_data["class_id"],
                grade_id=s_data["grade_id"],
                school_id=teacher.school_id,
                active=True
            )
            db.add(student)
            count += 1
        else:
            # Update class if different (fix legacy data)
            if exists.class_id != s_data["class_id"]:
                exists.class_id = s_data["class_id"]
                db.add(exists)
                print(f"Updated {exists.name} to class {s_data['class_id']}")

    db.commit()
    print(f"Seeding complete! Added {count} new students.")

if __name__ == "__main__":
    seed_students()
