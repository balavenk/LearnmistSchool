from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
from passlib.context import CryptContext

db: Session = SessionLocal()

def seed_data():
    print("Seeding teacher data...")
    
    # 1. Find teacher1
    teacher = db.query(models.User).filter(models.User.username == "teacher1").first()
    if not teacher:
        print("Error: teacher1 not found. Please ensure seed.py was run or create teacher1.")
        return

    print(f"Found teacher: {teacher.username} (ID: {teacher.id})")

    # 2. Find or Create Grade 10
    grade_10 = db.query(models.Grade).filter(models.Grade.name == "Grade 10", models.Grade.school_id == teacher.school_id).first()
    if not grade_10:
        print("Creating Grade 10...")
        grade_10 = models.Grade(name="Grade 10", school_id=teacher.school_id)
        db.add(grade_10)
        db.commit()
        db.refresh(grade_10)
    print(f"Using Grade: {grade_10.name} (ID: {grade_10.id})")

    # 3. Find or Create Subjects
    subjects_to_assign = ["Mathematics", "Science"]
    
    for sub_name in subjects_to_assign:
        subject = db.query(models.Subject).filter(models.Subject.name == sub_name, models.Subject.school_id == teacher.school_id).first()
        if not subject:
            print(f"Creating Subject: {sub_name}...")
            subject = models.Subject(name=sub_name, school_id=teacher.school_id)
            db.add(subject)
            db.commit()
            db.refresh(subject)
        
        # 4. Create Assignment if not exists
        existing_assignment = db.query(models.TeacherAssignment).filter(
            models.TeacherAssignment.teacher_id == teacher.id,
            models.TeacherAssignment.subject_id == subject.id,
            models.TeacherAssignment.grade_id == grade_10.id
        ).first()

        if not existing_assignment:
            print(f"Assigning {sub_name} to {teacher.username} for {grade_10.name}...")
            assignment = models.TeacherAssignment(
                teacher_id=teacher.id,
                subject_id=subject.id,
                grade_id=grade_10.id
            )
            db.add(assignment)
        else:
            print(f"Skipping: {sub_name} already assigned.")

    db.commit()
    print("Seeding complete!")

if __name__ == "__main__":
    seed_data()
