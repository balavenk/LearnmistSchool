from database import SessionLocal
from app import models
import os

# Mimic the constant in upload.py
STORAGE_ROOT = "storage"

def verify_fix(file_id):
    db = SessionLocal()
    try:
        artifact = db.query(models.FileArtifact).filter(models.FileArtifact.id == file_id).first()
        
        if not artifact:
            print("File not found in DB.")
            return

        print(f"File ID: {artifact.id}")
        print(f"DB Relative Path: {artifact.relative_path}")
        
        # Emulate the logic currently in backend/routers/upload.py
        base_dir = os.path.dirname(os.path.abspath(__file__)) # This script is in backend/
        
        # Current logic in upload.py
        resolved_path = os.path.join(base_dir, STORAGE_ROOT, artifact.relative_path)
        
        print(f"Code resolves this to: {resolved_path}")
        
        if os.path.exists(resolved_path):
            print("SUCCESS: File found at this path.")
            print("Conclusion: The code fix (adding STORAGE_ROOT) is working correctly. No DB update needed.")
        else:
            print("FAILURE: File NOT found at this path.")
            
            # Check if user suggestion (adding storage to DB) would work with current code?
            # If DB had 'storage/1/10...', code would look in 'backend/storage/storage/1/10...' -> Wrong.
            
            # Check where it ACTUALLY is
            guessed_path = os.path.join(base_dir, "storage", artifact.relative_path)
            if os.path.exists(guessed_path): 
                 print(f"File exists at: {guessed_path}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    # Assuming ID is 3 or 4 based on previous logs. I'll search for the filename jesc101.pdf
    db = SessionLocal()
    art = db.query(models.FileArtifact).filter(models.FileArtifact.original_filename.like("%jesc101.pdf%")).order_by(models.FileArtifact.id.desc()).first()
    db.close()
    
    if art:
        verify_fix(art.id)
    else:
        print("Could not find jesc101.pdf in DB to verify.")
