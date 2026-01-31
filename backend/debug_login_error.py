from sqlalchemy.orm import Session
from database import SessionLocal
import models
import auth
from fastapi.security import OAuth2PasswordRequestForm
from datetime import datetime

def debug_login():
    db: Session = SessionLocal()
    try:
        username = "alicej"
        print(f"Attempting to find user: {username}")
        user = db.query(models.User).filter(models.User.username == username).first()
        
        if not user:
            print("User NOT FOUND.")
            return

        print(f"User Found: {user.username}, Role: {user.role}")
        print(f"Current last_login: {user.last_login}")

        # Simulate update
        print("Attempting to update last_login...")
        user.last_login = datetime.utcnow()
        db.commit()
        print("Commit SUCCESSFUL.")
        
        db.refresh(user)
        print(f"New last_login: {user.last_login}")

    except Exception as e:
        print(f"LOGIN FAILED WITH ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    debug_login()
