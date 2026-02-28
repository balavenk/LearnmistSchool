from sqlalchemy.orm import Session
from database import SessionLocal
from app import models
from app import auth

db: Session = SessionLocal()

def test_login():
    username = "superadmin"
    password = "password123"
    
    print(f"Testing login for: {username} / {password}")
    
    user = db.query(models.User).filter(models.User.username == username).first()
    
    if not user:
        print("User not found!")
        return
        
    print(f"User found: {user.username}, Role: {user.role}, Active: {user.active}")
    print(f"Stored Hash: {user.hashed_password}")
    
    is_valid = auth.verify_password(password, user.hashed_password)
    print(f"Password Check Result: {is_valid}")
    
    if is_valid:
        print("LOGIN SHOULD SUCCEED")
    else:
        print("LOGIN FAILED")

if __name__ == "__main__":
    test_login()
