from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

db: Session = SessionLocal()

def seed_classes():
    print("Seeding Classes and Assignments...")
    
    # 1. Find teacher1
    teacher = db.query(models.User).filter(models.User.username == "teacher1").first()
    if not teacher:
        print("Error: teacher1 not found.")
        return

    # 2. Find Grade 10
    grade_10 = db.query(models.Grade).filter(models.Grade.name == "Grade 10", models.Grade.school_id == teacher.school_id).first()
    if not grade_10:
        print("Error: Grade 10 not found. Run previous seed script first.")
        return

    # 3. Create Classes '10 A' and '10 B'
    classes_data = [
        {"name": "10 A", "section": "A"},
        {"name": "10 B", "section": "B"}
    ]
    
    created_classes = []
    for c_data in classes_data:
        cls = db.query(models.Class).filter(
            models.Class.name == c_data["name"], 
            models.Class.grade_id == grade_10.id
        ).first()
        
        if not cls:
            print(f"Creating Class {c_data['name']}...")
            cls = models.Class(
                name=c_data["name"],
                section=c_data["section"],
                grade_id=grade_10.id,
                school_id=teacher.school_id
            )
            db.add(cls)
            db.commit()
            db.refresh(cls)
        created_classes.append(cls)

    # 4. Assign Classes to Teacher for 'Mathematics' (and 'Science')
    subjects = db.query(models.Subject).filter(
        models.Subject.school_id == teacher.school_id,
        models.Subject.name.in_(["Mathematics", "Science"])
    ).all()

    if not subjects:
        print("Error: Subjects not found.")
        return

    for subject in subjects:
        for cls in created_classes:
            # Check if explicit assignment exists
            exists = db.query(models.TeacherAssignment).filter(
                models.TeacherAssignment.teacher_id == teacher.id,
                models.TeacherAssignment.subject_id == subject.id,
                models.TeacherAssignment.class_id == cls.id
            ).first()
            
            if not exists:
                print(f"Assigning {subject.name} - {cls.name} to teacher1...")
                ta = models.TeacherAssignment(
                    teacher_id=teacher.id,
                    subject_id=subject.id,
                    grade_id=grade_10.id,
                    class_id=cls.id
                )
                db.add(ta)
            else:
                print(f"Assignment {subject.name} - {cls.name} already exists.")

    db.commit()
    print("Class Seeding Complete!")

if __name__ == "__main__":
    seed_classes()
