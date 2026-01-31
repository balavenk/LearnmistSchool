from sqlalchemy.orm import Session
from database import SessionLocal
import models
from datetime import datetime

def debug_data():
    db = SessionLocal()
    try:
        print("--- Debugging Data ---")
        student = db.query(models.Student).filter(models.Student.name == "student1").first()
        if not student:
            print("Student 'student1' not found!")
            return

        print(f"Student: {student.name}, ID: {student.id}, Class ID: {student.class_id}")
        
        if not student.class_id:
            print("Student has no class assigned!")
            return

        # Check Assignments for this class
        assignments = db.query(models.Assignment).filter(
            models.Assignment.class_id == student.class_id,
            models.Assignment.status == models.AssignmentStatus.PUBLISHED
        ).all()
        
        print(f"Total Published Assignments for Class {student.class_id}: {len(assignments)}")
        for a in assignments:
            print(f" - ID: {a.id}, Title: {a.title}, Status: {a.status}, SubjectID: {a.subject_id}")
            # Try accessing subject_id directly first
            if a.subject_id:
               print(f"   Subject ID exists: {a.subject_id}")


        # Check Submissions
        submissions = db.query(models.Submission).filter(models.Submission.student_id == student.id).all()
        print(f"Total Submissions for Student: {len(submissions)}")
        submitted_ids = [s.assignment_id for s in submissions]
        
        # Check Open Logic
        open_assignments = [a for a in assignments if a.id not in submitted_ids]
        print(f"Calculated Open Assignments: {len(open_assignments)}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_data()
