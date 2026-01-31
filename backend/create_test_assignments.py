from sqlalchemy.orm import Session
from database import SessionLocal
import models
from datetime import datetime, timedelta

def create_test_data():
    db = SessionLocal()
    try:
        print("Creating test data...")
        
        # 1. Find Student1
        student = db.query(models.Student).filter(models.Student.name == "student1").first()
        if not student:
            print("Error: student1 not found. Please run seed.py first.")
            return

        print(f"Found student: {student.name}, Class ID: {student.class_id}")
        
        if not student.class_id:
             # Assign to a class if not assigned
             cls = db.query(models.Class).first()
             if cls:
                 student.class_id = cls.id
                 db.commit()
                 print(f"Assigned student to class: {cls.name}")
             else:
                 print("Error: No classes found.")
                 return

        # 2. Find Teacher and Subject
        teacher = db.query(models.User).filter(models.User.role == models.UserRole.TEACHER).first()
        subject = db.query(models.Subject).first()
        
        if not teacher:
            print("Error: No teacher found.")
            return

        if not subject:
            print("No subject found. Creating 'Mathematics'...")
            subject = models.Subject(name="Mathematics", school_id=student.school_id)
            db.add(subject)
            db.commit()
            db.refresh(subject)

        # 3. Create Open Assignment
        open_assignment = models.Assignment(
            title="Math Homework - Linear Algebra",
            description="Complete exercises 1-10 on page 42.",
            due_date=datetime.now() + timedelta(days=3),
            status=models.AssignmentStatus.PUBLISHED,
            teacher_id=teacher.id,
            class_id=student.class_id,
            subject_id=subject.id
        )
        db.add(open_assignment)
        
        # 4. Create Completed Assignment
        completed_assignment = models.Assignment(
            title="History Essay - WW2",
            description="Write a 500 word essay on the causes of WW2.",
            due_date=datetime.now() - timedelta(days=1), # Past due
            status=models.AssignmentStatus.PUBLISHED,
            teacher_id=teacher.id,
            class_id=student.class_id,
            subject_id=subject.id
        )
        db.add(completed_assignment)
        db.commit() # Commit assignments to get IDs
        
        # 5. Create Submission for Completed Assignment
        submission = models.Submission(
            assignment_id=completed_assignment.id,
            student_id=student.id,
            status=models.SubmissionStatus.SUBMITTED,
            submitted_at=datetime.now() - timedelta(days=2),
            grade="A",
            feedback="Excellent work!"
        )
        db.add(submission)
        
        db.commit()
        print("Test data created successfully!")
        print(f"Open Assignment: {open_assignment.title}")
        print(f"Completed Assignment: {completed_assignment.title}")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_data()
