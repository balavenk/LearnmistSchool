from sqlalchemy.orm import Session
from database import SessionLocal, engine
from app import models
from app import auth

db = SessionLocal()

try:
    user = db.query(models.User).filter(models.User.username == "superadmin").first()
    if user:
        print(f"User found: {user.username}")
        print(f"Role: {user.role}")
        print(f"Is Active: {user.active}")
        
        # Verify password 'password123'
        is_valid = auth.verify_password("password123", user.hashed_password)
        print(f"Password 'password123' valid: {is_valid}")
        
        if not is_valid:
            print("Resetting password to 'password123'...")
            user.hashed_password = auth.get_password_hash("password123")
            db.commit()
            print("Password reset.")
    else:
        print("User 'superadmin' NOT FOUND.")
        # Create it
        print("Creating 'superadmin'...")
        user = models.User(
            username="superadmin",
            email="superadmin@example.com",
            hashed_password=auth.get_password_hash("password123"),
            role=models.UserRole.SUPER_ADMIN,
            is_active=True
        )
        db.add(user)
        db.commit()
        print("User 'superadmin' created.")

except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
