from sqlalchemy.orm import Session
from database import SessionLocal
from app import models
from app import auth

def list_users():
    db = SessionLocal()
    try:
        users = db.query(models.User).all()
        print(f"{'ID':<5} {'Username':<20} {'Role':<15} {'SchoolID':<10} {'Active':<10} {'Pwd=password123'}")
        print("-" * 80)
        
        for user in users:
            is_valid = auth.verify_password("password123", user.hashed_password)
            print(f"{user.id:<5} {user.username:<20} {user.role:<15} {str(user.school_id):<10} {str(user.active):<10} {is_valid}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    list_users()
