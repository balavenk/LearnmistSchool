from sqlalchemy.orm import Session
from database import SessionLocal
from app import models

db: Session = SessionLocal()

def link_schooladmin():
    print("Linking 'schooladmin' to Learnmist Demo School...")
    
    school = db.query(models.School).filter(models.School.name == "Learnmist Demo School").first()
    if not school:
        print("Error: 'Learnmist Demo School' not found.")
        return

    user = db.query(models.User).filter(models.User.username == "schooladmin").first()
    if not user:
        print("Error: User 'schooladmin' not found.")
        return

    if user.school_id == school.id:
        print("User 'schooladmin' is already linked to this school.")
        return

    user.school_id = school.id
    db.commit()
    print(f"Successfully linked 'schooladmin' to '{school.name}' (ID: {school.id}).")

if __name__ == "__main__":
    link_schooladmin()
