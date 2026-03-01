from sqlalchemy.orm import Session
from database import SessionLocal
from app import models
from auth import get_password_hash

db: Session = SessionLocal()

def reset_superadmin():
    username = "superadmin"
    password = "password123"
    
    user = db.query(models.User).filter(models.User.username == username).first()
    
    hashed_pw = get_password_hash(password)
    
    if user:
        print(f"User {username} found. Resetting password...")
        user.hashed_password = hashed_pw
        user.active = True
        user.role = models.UserRole.SUPER_ADMIN
        # Super admin usually doesn't belong to a school, but ensure it's None to avoid confusion unless intended
        # user.school_id = None 
        db.commit()
        print(f"Password for {username} has been reset to '{password}'.")
    else:
        print(f"User {username} not found. Creating...")
        new_user = models.User(
            username=username,
            email="superadmin@example.com",
            hashed_password=hashed_pw,
            role=models.UserRole.SUPER_ADMIN,
            active=True,
            school_id=None
        )
        db.add(new_user)
        db.commit()
        print(f"User {username} created with password '{password}'.")

if __name__ == "__main__":
    reset_superadmin()
