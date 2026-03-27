from app.database import SessionLocal
from app.models import Question
import sys

db = SessionLocal()
qs = db.query(Question.id, Question.text, Question.source_year).filter(Question.assignment_id == None).all()
print("Bank Questions in DB:")
for q in qs:
    print(f"ID: {q.id}, Text: '{q.text[:20]}...', Source Year: {q.source_year}")
