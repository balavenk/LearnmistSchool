from sqlalchemy.orm import Session
from database import SessionLocal
from app import models

db: Session = SessionLocal()

def inspect_assignments():
    assignments = db.query(models.Assignment).all()
    print(f"Total Assignments: {len(assignments)}")
    for a in assignments:
        c_name = a.assigned_class.name if a.assigned_class else "None/Unknown"
        print(f"ID: {a.id}, Title: {a.title}, ClassID: {a.class_id}, ClassName: {c_name}")

if __name__ == "__main__":
    inspect_assignments()
