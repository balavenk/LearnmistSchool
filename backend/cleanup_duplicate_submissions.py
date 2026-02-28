import os
import sys

os.environ["DATABASE_URL"] = "sqlite:////home/balav/app/backend/learnmistschool.db"
sys.path.append('/home/balav/app/backend')

from app.database import SessionLocal
from app.models import Submission, SubmissionStatus

db = SessionLocal()
try:
    print("Finding duplicate pending submissions...")
    # Get all submitted or graded submissions
    completed_subs = db.query(Submission).filter(
        Submission.status.in_([SubmissionStatus.SUBMITTED, SubmissionStatus.GRADED])
    ).all()
    
    deleted_count = 0
    for comp in completed_subs:
        # Find any PENDING submission for the same student and assignment
        pending_dupe = db.query(Submission).filter(
            Submission.assignment_id == comp.assignment_id,
            Submission.student_id == comp.student_id,
            Submission.status == SubmissionStatus.PENDING,
            Submission.id != comp.id
        ).first()
        
        if pending_dupe:
            print(f"Deleting duplicate PENDING sub {pending_dupe.id} for Assignment {comp.assignment_id} (Student {comp.student_id})")
            db.delete(pending_dupe)
            deleted_count += 1
            
    if deleted_count > 0:
        db.commit()
    print(f"Cleanup complete. Deleted {deleted_count} orphaned pending submissions.")

finally:
    db.close()
