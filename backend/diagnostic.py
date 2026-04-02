import sys
import os

# Set up paths to be able to import app
sys.path.append('d:/CodeBase/Freelancing/LearnmistSchool/backend')
os.environ["DATABASE_URL"] = "sqlite:///./learnmist.db" # using assumed default

from app import models, database, schemas
from sqlalchemy.orm import Session, joinedload

def run_test():
    # Use existing DB
    engine = database.engine
    db = database.SessionLocal()
    
    try:
        # Get valid user and paper
        user = db.query(models.User).filter(models.User.role == 'TEACHER').first()
        if not user:
            print("No teacher found")
            return
            
        paper = db.query(models.QuestionPaper).filter(models.QuestionPaper.created_by_id == user.id).first()
        if not paper:
            print("No paper found for teacher")
            return
            
        question = db.query(models.Question).first()
        if not question:
            print("No questions found")
            return
            
        print(f"Testing mapping Question {question.id} to Paper {paper.id}")
        
        # Reproduce the exact logic from the endpoint
        existing = db.query(models.PaperQuestionMapping).filter(
            models.PaperQuestionMapping.paper_id == paper.id,
            models.PaperQuestionMapping.question_id == question.id
        ).first()
        
        if existing:
            existing.section_name = "A"
            existing.order_in_section = 1
            db.commit()
            db.refresh(existing)
            res = db.query(models.PaperQuestionMapping).options(joinedload(models.PaperQuestionMapping.question)).filter(models.PaperQuestionMapping.id == existing.id).first()
            print("Returning existing")
            out = schemas.PaperQuestionMappingDetail.model_validate(res)
            print("Success serialization existing!")
        else:
            new_map = models.PaperQuestionMapping(
                paper_id=paper.id,
                question_id=question.id,
                section_name="A",
                order_in_section=1
            )
            db.add(new_map)
            db.commit()
            db.refresh(new_map)
            
            res = db.query(models.PaperQuestionMapping).options(joinedload(models.PaperQuestionMapping.question)).filter(models.PaperQuestionMapping.id == new_map.id).first()
            print("Returning new_map")
            
            # Serialize
            out = schemas.PaperQuestionMappingDetail.model_validate(res)
            print("Success serialization new_map!")
            
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_test()
