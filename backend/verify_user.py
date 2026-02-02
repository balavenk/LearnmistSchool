from sqlalchemy.orm import Session
from database import SessionLocal
import models
import auth

def verify():
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.username == "schooladmin").first()
        if not user:
            print("User 'schooladmin' NOT FOUND.")
            return

        print(f"User found: {user.username}")
        print(f"Role: {user.role}")
        print(f"Active: {user.active}")
        print(f"School ID: {user.school_id}")
        
        if auth.verify_password("password123", user.hashed_password):
            print("Password 'password123' MATCHES.")
        else:
            print("Password 'password123' DOES NOT MATCH.")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    verify()
