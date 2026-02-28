import sys
import os
sys.path.append('/home/balav/app/backend')

os.environ["DATABASE_URL"] = "sqlite:////home/balav/app/backend/learnmistschool.db"
from app.database import SessionLocal, engine
from app.models import Assignment, Student, Submission, AssignmentStatus, SubmissionStatus, Base

Base.metadata.create_all(bind=engine) # Optional safegaurd
db = SessionLocal()
try:
    print("Finding published assignments with no submissions...")
    # Find all published assignments by Teacher 1
    assignments = db.query(Assignment).filter(
        Assignment.teacher_id == 3,
        Assignment.status == AssignmentStatus.PUBLISHED
    ).all()
    
    for assignment in assignments:
        print(f"Checking Assignment ID {assignment.id}: {assignment.title}")
        
        # This teacher has class ID 1 explicitly (from our previous SQL check)
        students = db.query(Student).filter(Student.class_id == 1).all()
        print(f"  Found {len(students)} target students in class.")
        
        added = 0
        for student in students:
            existing = db.query(Submission).filter(
                Submission.assignment_id == assignment.id,
                Submission.student_id == student.id
            ).first()
            
            if not existing:
                new_sub = Submission(
                    assignment_id=assignment.id,
                    student_id=student.id,
                    status=SubmissionStatus.PENDING
                )
                db.add(new_sub)
                added += 1
        
        db.commit()
        print(f"  Created {added} new PENDING submissions for this assignment.")
        
    print("Backfill complete.")
    
finally:
    db.close()
