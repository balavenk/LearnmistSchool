from sqlalchemy.orm import Session
from database import SessionLocal
from app import models
from auth import get_password_hash # Assuming auth.py is in the same directory and has this function or similar
# If auth is not directly importable due to structure, I might need to replicate hash or fix path.
# Checking existing files, auth.py is likely in backend.

db: Session = SessionLocal()

def create_teacher2():
    username = "teacher2"
    password = "password123"
    
    # Check if exists
    user = db.query(models.User).filter(models.User.username == username).first()
    
    hashed_pw = get_password_hash(password)
    
    if user:
        print(f"User {username} exists. Updating password...")
        user.hashed_password = hashed_pw
        user.active = True
        # Ensure role is teacher
        user.role = models.UserRole.TEACHER
        db.commit()
        print(f"Updated {username} password.")
    else:
        print(f"Creating user {username}...")
        # Need to find a school? The user didn't specify, but I should probably link to the demo school if possible, 
        # or leave null. The previous step linked all users to Demo School, so maybe I should link this one too.
        # I'll try to find "Learnmist Demo School"
        school = db.query(models.School).filter(models.School.name == "Learnmist Demo School").first()
        school_id = school.id if school else None
        
        new_user = models.User(
            username=username,
            email="teacher2@example.com", # detailed email not provided, using dummy
            hashed_password=hashed_pw,
            role=models.UserRole.TEACHER,
            active=True,
            school_id=school_id
        )
        db.add(new_user)
        db.commit()
        print(f"Created {username}.")

if __name__ == "__main__":
    create_teacher2()
