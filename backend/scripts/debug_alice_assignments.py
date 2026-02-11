from sqlalchemy.orm import Session
from database import SessionLocal
from app import models
from models import User, Student, Assignment

def debug_alice():
    db: Session = SessionLocal()
    try:
        # 1. Find User "alicej"
        user = db.query(User).filter(User.username == "alicej").first()
        if not user:
            print("User 'alicej' NOT FOUND.")
            return

        print(f"User Found: ID={user.id}, Username={user.username}, Role={user.role}, SchoolID={user.school_id}")

        # 2. Find Student linked to this user (New Way)
        student_by_id = db.query(Student).filter(Student.user_id == user.id).first()
        if student_by_id:
            print(f"Student found by user_id: ID={student_by_id.id}, Name='{student_by_id.name}', ClassID={student_by_id.class_id}")
        else:
            print("Student NOT FOUND by user_id.")

        # 3. Find Student by name (Old Way - what the code currently does)
        student_by_name = db.query(Student).filter(
            Student.name == user.username,
            Student.school_id == user.school_id
        ).first()
        
        if student_by_name:
             print(f"Student found by name matching username: ID={student_by_name.id}, Name='{student_by_name.name}'")
        else:
             print(f"Student NOT FOUND by name criteria (Name='{user.username}', SchoolID={user.school_id}).")

        # 4. If we found a student (prefer by_id), check assignments
        student = student_by_id or student_by_name
        if student:
            print(f"Checking assignments for Class ID: {student.class_id}")
            if student.class_id:
                assignments = db.query(Assignment).filter(
                    Assignment.class_id == student.class_id
                ).all()
                print(f"Total Assignments for Class {student.class_id}: {len(assignments)}")
                for a in assignments:
                    print(f" - ID: {a.id}, Title: {a.title}, Status: {a.status}")
            else:
                print("Student has no Class ID.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    debug_alice()
