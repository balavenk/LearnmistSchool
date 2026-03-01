from database import SessionLocal
from app import models
import urllib.request
import urllib.parse
import json

BASE_URL = "http://localhost:8000"

def check_db_directly():
    print("\n--- Direct DB Check ---")
    db = SessionLocal()
    try:
        files = db.query(models.FileArtifact).order_by(models.FileArtifact.id.desc()).all()
        print(f"Total Files in DB: {len(files)}")
        for f in files:
            print(f"ID: {f.id} | Name: {f.original_filename} | Status: '{f.file_status}'") 
            print(f"   - SchoolID: {f.school_id}, GradeID: {f.grade_id}, SubjectID: {f.subject_id}")
            # Check if linked entities exist
            school = db.query(models.School).filter(models.School.id == f.school_id).first()
            grade = db.query(models.Grade).filter(models.Grade.id == f.grade_id).first()
            subject = db.query(models.Subject).filter(models.Subject.id == f.subject_id).first()
            
            missing = []
            if not school: missing.append("School")
            if not grade: missing.append("Grade")
            if not subject: missing.append("Subject")
            
            if missing:
                print(f"   - \u26A0\uFE0F MISSING RELATIONS: {', '.join(missing)}")
            else:
                print(f"   - All relations valid (School: {school.name}, Subject: {subject.name})")
                
    except Exception as e:
        print(f"DB Error: {e}")
    finally:
        db.close()

def login(username, password):
    url = f"{BASE_URL}/token"
    data = urllib.parse.urlencode({
        "username": username,
        "password": password
    }).encode()
    
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    
    try:
        with urllib.request.urlopen(req) as response:
            res_json = json.loads(response.read().decode())
            return res_json["access_token"]
    except Exception as e:
        print(f"Login failed: {e}")
        return None

def check_api_compliance(token):
    print("\n--- API Response Check ---")
    url = f"{BASE_URL}/upload/all-training-materials"
    req = urllib.request.Request(url, method="GET")
    req.add_header("Authorization", f"Bearer {token}")
    
    try:
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode())
            print(f"Total Files returned by API: {len(data)}")
            for item in data:
                 print(f"API Item - ID: {item.get('id')} | Name: {item.get('original_filename')} | Status: {item.get('file_status')}")
    except Exception as e:
        print(f"API Fetch failed: {e}")

if __name__ == "__main__":
    check_db_directly()
    
    print("\nLogging in as superadmin...")
    token = login("superadmin", "password123")
    if token:
        check_api_compliance(token)
    else:
        print("Could not log in to check API.")
