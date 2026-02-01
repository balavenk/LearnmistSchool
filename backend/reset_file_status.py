from database import SessionLocal
from models import FileArtifact

def reset_status():
    db = SessionLocal()
    try:
        files = db.query(FileArtifact).all()
        print(f"Found {len(files)} files. Updating status to 'Uploaded'...")
        for file in files:
            file.file_status = "Uploaded"
        db.commit()
        print("Update complete.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_status()
