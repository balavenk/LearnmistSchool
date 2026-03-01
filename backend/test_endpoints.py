import sys
import os
sys.path.append('/home/balav/app/backend')

from app.database import SessionLocal
from app.models import User, TeacherAssignment, Subject, Grade
from app.routers.teacher import read_subjects, read_grades

db = SessionLocal()
try:
    teacher = db.query(User).filter(User.id == 3).first()
    print(f"Teacher: {teacher.username}")
    
    print("\n--- Teacher Assignments in DB ---")
    assignments = db.query(TeacherAssignment).filter(TeacherAssignment.teacher_id == 3).all()
    for a in assignments:
        print(f"Assign ID: {a.id}, Subj: {a.subject_id}, Grade: {a.grade_id}, Class: {a.class_id}")
        
    print("\n--- Testing read_subjects ---")
    subjects = read_subjects(db=db, current_user=teacher)
    print("Returned Subjects:", [s.name for s in subjects])
    
    print("\n--- Testing read_grades ---")
    grades = read_grades(db=db, current_user=teacher)
    print("Returned Grades:", [g.name for g in grades])
    
finally:
    db.close()
