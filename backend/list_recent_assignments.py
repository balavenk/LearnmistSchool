from sqlalchemy.orm import Session
import database, models

db = database.SessionLocal()
try:
    print(f"{'ID':<5} {'Title':<50} {'Status':<10} {'TeacherID':<10}")
    print("-" * 80)
    assignments = db.query(models.Assignment).order_by(models.Assignment.id.desc()).limit(5).all()
    for a in assignments:
        print(f"{a.id:<5} {a.title[:48]:<50} {a.status:<10} {a.teacher_id:<10}")
except Exception as e:
    print(f"Error: {e}")
finally:
    db.close()
