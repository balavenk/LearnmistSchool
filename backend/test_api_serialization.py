from sqlalchemy.orm import Session
from database import SessionLocal
import models
import schemas
from pydantic import ValidationError

db: Session = SessionLocal()

def test_serialization():
    print("--- Testing API Serialization ---")
    
    # 1. Get Teacher and Alice
    teacher = db.query(models.User).filter(models.User.username == "teacher1").first()
    alice = db.query(models.Student).filter(models.Student.name == "Alice Johnson").first()
    
    if not teacher or not alice:
        print("Teacher or Alice missing.")
        return

    # 2. Get Submissions using the logic from router
    submissions = db.query(models.Submission).join(models.Assignment).filter(
        models.Submission.student_id == alice.id,
        models.Submission.status != models.SubmissionStatus.GRADED,
        models.Assignment.teacher_id == teacher.id
    ).all()
    
    print(f"Found {len(submissions)} submissions.")
    
    # 3. Serialize using Pydantic model
    for sub in submissions:
        try:
            print(f"Serializing sub {sub.id}...")
            
            # Manual check
            # Accessing relationships to trigger any lazy load errors
            print(f" - Inspecting SQLAlchemy relationships...")
            print(f"   - Assignment: {sub.assignment.title}")
            print(f"   - Questions: {len(sub.assignment.questions)}")
            print(f"   - Answers: {len(sub.answers)}")
            for a in sub.answers:
                print(f"     - Ans {a.id}: q={a.question_id}, points={a.points_awarded}")

            # Pydantic v2 use model_validate, v1 used from_orm
            pydantic_obj = schemas.SubmissionDetail.model_validate(sub)
            data = pydantic_obj.model_dump()
            
            # Check assignment questions
            questions = data.get('assignment', {}).get('questions', [])
            print(f" - SUCCESS: Sub ID: {sub.id}, Assignment: {data['assignment']['title']}, Questions Count: {len(questions)}")
            
        except ValidationError as e:
            print(f" - FAILURE: Serialization Error for sub {sub.id}:")
            for err in e.errors():
                print(f"   => type={err['type']}, loc={err['loc']}, msg={err['msg']}")
        except Exception as e:
            print(f" - FAILURE: General Error for sub {sub.id}: {e}")

if __name__ == "__main__":
    test_serialization()
