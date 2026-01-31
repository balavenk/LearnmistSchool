from sqlalchemy.orm import Session
from database import SessionLocal
import models

db: Session = SessionLocal()

def debug_schools():
    print("--- Debugging School IDs ---")
    
    # 1. School Admin
    # Assuming standard admin username "schooladmin" or similar. Checking all school admins.
    admins = db.query(models.User).filter(models.User.role == models.UserRole.SCHOOL_ADMIN).all()
    print(f"Found {len(admins)} School Admins:")
    for a in admins:
        print(f" - Admin: {a.username}, ID: {a.id}, School ID: {a.school_id}")

    # 2. Teacher1
    teacher = db.query(models.User).filter(models.User.username == "teacher1").first()
    if teacher:
        print(f"Teacher: {teacher.username}, ID: {teacher.id}, School ID: {teacher.school_id}")
    else:
        print("Teacher1 NOT FOUND")

    # 3. Alice Johnson
    alice = db.query(models.Student).filter(models.Student.name == "Alice Johnson").first()
    if alice:
        print(f"Student: {alice.name}, ID: {alice.id}, School ID: {alice.school_id}")
    else:
        print("Alice Johnson NOT FOUND")

    # 4. List all students for the first admin's school (if exists)
    if admins:
        admin_school_id = admins[0].school_id
        students_count = db.query(models.Student).filter(models.Student.school_id == admin_school_id).count()
        print(f"Total students in School ID {admin_school_id}: {students_count}")

if __name__ == "__main__":
    debug_schools()
