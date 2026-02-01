from database import SessionLocal
import models
import os

def check_file_id(file_id):
    db = SessionLocal()
    try:
        print(f"Checking for File ID: {file_id}")
        artifact = db.query(models.FileArtifact).filter(models.FileArtifact.id == file_id).first()
        
        if not artifact:
            print(f"RESULT: File ID {file_id} NOT FOUND in database. It might have been deleted.")
            
            # List all available files to help user
            print("\nAvailable Files:")
            all_files = db.query(models.FileArtifact).all()
            for f in all_files:
                print(f"- ID: {f.id} | Name: {f.original_filename} | Uploaded: {f.uploaded_at}")
            return

        print(f"RESULT: File ID {file_id} EXISTS.")
        print(f"Original Filename: {artifact.original_filename}")
        print(f"Relative Path (DB): {artifact.relative_path}")
        
        # Check Physical Existence with CORRECTED logic
        # backend/storage/relative_path
        base_dir = os.path.dirname(os.path.abspath(__file__))
        storage_path = os.path.join(base_dir, "storage", artifact.relative_path)
        
        print(f"Checking Physical Path: {storage_path}")
        if os.path.exists(storage_path):
            print("Physical Status: VALID (File exists on disk)")
        else:
            print("Physical Status: MISSING (File not found on disk)")
            # Check without 'storage' prefix just in case old logic was used during save
            wrong_path = os.path.join(base_dir, artifact.relative_path)
            if os.path.exists(wrong_path):
                print(f"NOTE: File found at WRONG path (missing 'storage' folder): {wrong_path}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_file_id(3)
