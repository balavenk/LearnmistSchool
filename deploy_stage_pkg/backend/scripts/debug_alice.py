from sqlalchemy.orm import Session
from database import SessionLocal
from app import models
from datetime import datetime, timedelta

db: Session = SessionLocal()

def debug_alice():
    print("--- Debugging Alice's Data ---")
    
    # 1. Check Teacher
    teacher = db.query(models.User).filter(models.User.username == "teacher1").first()
    if not teacher:
        print("Teacher1 NOT FOUND")
        return
    print(f"Teacher1 ID: {teacher.id}")

    # 2. Check Alice
    alice = db.query(models.Student).filter(models.Student.name == "Alice Johnson").first()
    if not alice:
        print("Alice Johnson NOT FOUND")
        return
    print(f"Alice ID: {alice.id}, Class ID: {alice.class_id}")

    # 3. Check Assignments for Teacher
    assignments = db.query(models.Assignment).filter(models.Assignment.teacher_id == teacher.id).all()
    print(f"Teacher has {len(assignments)} assignments.")
    for a in assignments:
        q_count = len(a.questions) if a.questions else 0
        print(f" - Assignment ID: {a.id}, Title: {a.title}, Questions: {q_count}, ClassID: {a.class_id}")

    # 4. Check Submissions for Alice
    submissions = db.query(models.Submission).filter(models.Submission.student_id == alice.id).all()
    print(f"Alice has {len(submissions)} submissions.")
    for s in submissions:
        print(f" - Submission ID: {s.id}, Assignment ID: {s.assignment_id}, Status: {s.status}")
        
    # 5. Check Filter Logic used in API
    # API: join(Assignment).filter(student_id==Alice, status!=GRADED, Assignment.teacher_id==Teacher)
    api_subs = db.query(models.Submission).join(models.Assignment).filter(
        models.Submission.student_id == alice.id,
        models.Submission.status != models.SubmissionStatus.GRADED,
        models.Assignment.teacher_id == teacher.id
    ).all()
    print(f"API Query (Pending/Submitted) returns: {len(api_subs)} records.")

if __name__ == "__main__":
    debug_alice()
