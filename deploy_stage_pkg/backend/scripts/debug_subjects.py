from sqlalchemy.orm import Session
from database import SessionLocal, engine
from app import models

# Create tables if not exist (just in case, though app is running)
models.Base.metadata.create_all(bind=engine)

def debug_subjects():
    db = SessionLocal()
    try:
        # 1. List all School Admins
        print("--- School Admins ---")
        admins = db.query(models.User).filter(models.User.role == models.UserRole.SCHOOL_ADMIN).all()
        for admin in admins:
            print(f"ID: {admin.id}, Username: {admin.username}, School ID: {admin.school_id}")
            
            # Check subjects for this school
            if admin.school_id:
                subjects = db.query(models.Subject).filter(models.Subject.school_id == admin.school_id).all()
                print(f"  -> Subjects for School {admin.school_id}: {[s.name for s in subjects]}")
            else:
                print("  -> No School ID assigned!")

        # 2. List all Subjects just to be sure
        print("\n--- All Subjects in DB ---")
        all_subjects = db.query(models.Subject).all()
        for sub in all_subjects:
            print(f"ID: {sub.id}, Name: {sub.name}, School ID: {sub.school_id}")

    finally:
        db.close()

if __name__ == "__main__":
    debug_subjects()
