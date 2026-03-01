from sqlalchemy.orm import Session
from database import SessionLocal
from app import models

def update_general_assignments():
    db = SessionLocal()
    try:
        # Find "History" subject for the school (assuming first school or generic)
        # We need to do this per school ideally, but let's assume one main school for now or loop schools
        
        schools = db.query(models.School).all()
        for school in schools:
            print(f"Processing School: {school.name} (ID: {school.id})")
            
            # Find or Create History Subject
            history_subject = db.query(models.Subject).filter(
                models.Subject.school_id == school.id,
                models.Subject.name == "History"
            ).first()
            
            if not history_subject:
                print("History subject not found. Creating it.")
                history_subject = models.Subject(name="History", school_id=school.id)
                db.add(history_subject)
                db.commit()
                db.refresh(history_subject)
            
            print(f"Target Subject: {history_subject.name} (ID: {history_subject.id})")
            
            # Update assignments for this school with missing subject
            # Assignments are linked to Class -> School
            # A bit complex to query assignments by school directly via relationship in raw SQL update, but ORM loops work.
            
            # Get classes for this school
            classes = db.query(models.Class).filter(models.Class.school_id == school.id).all()
            class_ids = [c.id for c in classes]
            
            if not class_ids:
                print("No classes found for this school.")
                continue

            assignments = db.query(models.Assignment).filter(
                models.Assignment.class_id.in_(class_ids),
                models.Assignment.subject_id == None
            ).all()
            
            print(f"Found {len(assignments)} assignments with no subject.")
            
            for a in assignments:
                a.subject_id = history_subject.id
                print(f"Updated '{a.title}' to History.")
                
            db.commit()
            
        print("Update complete.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_general_assignments()
