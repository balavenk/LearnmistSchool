from sqlalchemy.orm import Session
from database import SessionLocal
import models
from models import UserRole

db: Session = SessionLocal()

def link_users():
    print("Linking users to Learnmist Demo School...")
    
    school = db.query(models.School).filter(models.School.name == "Learnmist Demo School").first()
    if not school:
        print("Demo School not found.")
        return

    # Link Users (Super Admins usually don't belong to a school, but School Admin/Teacher/Student do)
    # We will exclude SUPER_ADMIN from school mapping unless forced.
    users = db.query(models.User).filter(models.User.role != UserRole.SUPER_ADMIN).all()
    count = 0
    for u in users:
        if u.school_id != school.id:
            u.school_id = school.id
            count += 1
    
    # Link Students
    students = db.query(models.Student).all()
    s_count = 0
    for s in students:
        if s.school_id != school.id:
            s.school_id = school.id
            s_count += 1
            
    db.commit()
    print(f"Updated {count} users and {s_count} students to belong to '{school.name}'.")

if __name__ == "__main__":
    link_users()
