from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import auth

def debug_login():
    db = SessionLocal()
    try:
        username = "superadmin"
        password = "password123"
        
        print(f"Checking user: {username}")
        user = db.query(models.User).filter(models.User.username == username).first()
        
        if not user:
            print("❌ User not found in DB!")
            return

        print(f"✅ User found. Role: {user.role}")
        print(f"Stored Hash: {user.hashed_password}")
        
        print(f"Verifying password: '{password}'")
        is_valid = auth.verify_password(password, user.hashed_password)
        
        if is_valid:
            print("✅ Password verification SUCCESS!")
        else:
            print("❌ Password verification FAILED!")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_login()
