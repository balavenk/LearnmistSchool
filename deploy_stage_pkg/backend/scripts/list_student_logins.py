from sqlalchemy.orm import Session
from database import SessionLocal
from app import models

db: Session = SessionLocal()

def list_logins():
    students = db.query(models.Student).all()
    
    print(f"\n--- Student Logins ---\n")
    print(f"{'Student Name':<30} | {'Username':<20} | {'Password':<15}")
    print("-" * 70)
    
    for student in students:
        if student.user_id:
            user = db.query(models.User).filter(models.User.id == student.user_id).first()
            if user:
                print(f"{student.name:<30} | {user.username:<20} | password123")
    print("\n")

if __name__ == "__main__":
    list_logins()
