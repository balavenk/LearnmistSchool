import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

from fastapi.testclient import TestClient
from main import app
from routers.individual import get_current_individual_user
from models import User, UserRole, School
import database
from sqlalchemy.orm import Session

def get_db():
    try:
        db = database.SessionLocal()
        yield db
    finally:
        db.close()

# 1. Get a valid Individual User ID and School ID from DB
db = database.SessionLocal()
try:
    # Find Individual School
    ind_school = db.query(School).filter(School.name == "Individual").first()
    school_id = ind_school.id if ind_school else 2
    
    # Find or Create Individual User
    user = db.query(User).filter(User.role == UserRole.INDIVIDUAL).first()
    if not user:
        print("No Individual user found. Using Mock ID 999")
        user_id = 999
    else:
        print(f"Using User: {user.username} (ID: {user.id})")
        user_id = user.id
finally:
    db.close()

# 2. Mock Dependency
def mock_get_current_user():
    class MockUser:
        id = user_id
        username = "mock_indiv"
        role = UserRole.INDIVIDUAL
        school_id = school_id
    return MockUser()

app.dependency_overrides[get_current_individual_user] = mock_get_current_user
client = TestClient(app)

def test_create():
    print("Sending POST /individual/quizzes...")
    payload = {
        "title": "Backend Test Quiz",
        "description": "Created via test script",
        "subject_name": "Deep Learning", # New subject
        "exam_type": "Quiz",
        "question_count": 5,
        "difficulty_level": "Hard",
        "question_type": "Multiple Choice",
        "due_date": None
    }
    try:
        resp = client.post("/individual/quizzes", json=payload)
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.json()}")
    except Exception as e:
        print(f"Exception: {e}")

if __name__ == "__main__":
    test_create()
