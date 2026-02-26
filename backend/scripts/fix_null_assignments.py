import os
import sys

# Add the parent directory to sys.path to allow importing from app
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import database, models

def fix_null_assignments():
    print("Starting data migration for assignments...")
    db = database.SessionLocal()
    
    try:
        assignments = db.query(models.Assignment).all()
        updated_count = 0
        
        for a in assignments:
            needs_update = False
            
            # Fix exam_type
            if a.exam_type is None:
                a.exam_type = "Quiz" if "quiz" in a.title.lower() else "Assignment"
                needs_update = True
                
            # Fix question_count
            if a.question_count is None:
                a.question_count = len(a.questions) if a.questions else 0
                needs_update = True
                
            # Fix difficulty_level
            if a.difficulty_level is None:
                a.difficulty_level = "Medium"
                needs_update = True
                
            # Fix question_type
            if a.question_type is None:
                # If there are questions, try to figure it out from the first one
                if a.questions and hasattr(a.questions[0], 'question_type') and a.questions[0].question_type:
                    a.question_type = a.questions[0].question_type.value if hasattr(a.questions[0].question_type, 'value') else str(a.questions[0].question_type)
                else:
                    a.question_type = "Mixed"
                needs_update = True
                
            if needs_update:
                updated_count += 1
                
        if updated_count > 0:
            db.commit()
            print(f"Successfully updated {updated_count} assignments with default data.")
        else:
            print("All assignments already have valid data. No updates needed.")
            
    except Exception as e:
        db.rollback()
        print(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_null_assignments()
