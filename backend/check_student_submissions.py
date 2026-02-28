import os
import sys

os.environ["DATABASE_URL"] = "sqlite:////home/balav/app/backend/learnmistschool.db"
sys.path.append('/home/balav/app/backend')

from app.database import SessionLocal
from app.models import Student, User, Submission, Assignment

db = SessionLocal()
try:
    print("Finding user davidl...")
    user = db.query(User).filter(User.username == 'davidl').first()
    if not user:
        print("Could not find user davidl")
        sys.exit(1)
        
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        print("Could not find student profile for davidl")
        sys.exit(1)
        
    print(f"Found student ID: {student.id}")
    
    submissions = db.query(Submission).filter(Submission.student_id == student.id).all()
    print(f"Total Submissions found: {len(submissions)}")
    
    for sub in submissions:
        assignment = db.query(Assignment).filter(Assignment.id == sub.assignment_id).first()
        title = assignment.title if assignment else "Unknown"
        status = sub.status
        print(f"- Sub ID: {sub.id} | Assignment ID: {sub.assignment_id} | Title: '{title}' | Status: {status}")

finally:
    db.close()
