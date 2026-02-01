import json
from sqlalchemy.orm import Session
from database import SessionLocal
import models

def debug_subjects_json():
    db = SessionLocal()
    data = {"admins": [], "subjects": []}
    try:
        admins = db.query(models.User).filter(models.User.role == models.UserRole.SCHOOL_ADMIN).all()
        for admin in admins:
            data["admins"].append({
                "id": admin.id,
                "username": admin.username,
                "school_id": admin.school_id
            })
            
        subjects = db.query(models.Subject).all()
        for sub in subjects:
            data["subjects"].append({
                "id": sub.id,
                "name": sub.name,
                "school_id": sub.school_id
            })
            
        print(json.dumps(data, indent=2))
    finally:
        db.close()

if __name__ == "__main__":
    debug_subjects_json()
