from sqlalchemy.orm import Session
from database import SessionLocal, engine
from app import models

def fix_data():
    db = SessionLocal()
    try:
        # Find Alice
        user = db.query(models.User).filter(models.User.username == "alicej").first()
        if not user:
            print("Alice not found")
            return

        student = db.query(models.Student).filter(models.Student.user_id == user.id).first()
        if not student:
            print("Student profile not found")
            return
            
        print(f"Fixing data for student: {student.name}, Class ID: {student.class_id}")
        
        # Get Assignments
        assignments = db.query(models.Assignment).filter(
            models.Assignment.class_id == student.class_id
        ).all()
        
        # Get Subjects
        subjects = db.query(models.Subject).filter(models.Subject.school_id == student.school_id).all()
        if not subjects:
            print("No subjects found! Creating some...")
            math = models.Subject(name="Mathematics", school_id=student.school_id)
            science = models.Subject(name="Science", school_id=student.school_id)
            history = models.Subject(name="History", school_id=student.school_id)
            db.add_all([math, science, history])
            db.commit()
            subjects = [math, science, history]
            
        print(f"Available Subjects: {[s.name for s in subjects]}")
        
        # Map by name for easier access
        sub_map = {s.name.lower(): s.id for s in subjects}
        
        # Assign subjects
        for a in assignments:
            title_lower = a.title.lower()
            old_sub = a.subject_id
            
            if "math" in title_lower or "algebra" in title_lower or "calc" in title_lower:
                a.subject_id = sub_map.get("mathematics")
            elif "science" in title_lower or "physic" in title_lower or "bio" in title_lower:
                a.subject_id = sub_map.get("science")
            elif "history" in title_lower:
                 a.subject_id = sub_map.get("history")
            else:
                # Default to first subject (Math) if unknown, to ensure no "General"
                # Or just distribute them
                a.subject_id = subjects[0].id
                
            print(f"Updated Assignment '{a.title}' (ID: {a.id}) Subject: {old_sub} -> {a.subject_id}")
            
        db.commit()
        print("Data fixed successfully.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_data()
