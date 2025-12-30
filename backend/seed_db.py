from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import mock_data
from sqlalchemy import text

def seed_data():
    db = SessionLocal()
    try:
        # Clear existing data (optional, but good for idempotent seeding)
        # We use strict ordering to avoid FK constraint errors
        print("Cleaning tables...")
        db.execute(text("TRUNCATE TABLE submissions, file_artifacts, assignments, students, classes, teacher_assignments, grades, subjects, users, schools RESTART IDENTITY CASCADE;"))
        db.commit()

        print("Seeding Schools...")
        for s in mock_data.SCHOOLS:
            db.merge(s)
        db.commit()

        print("Seeding Users...")
        for u in mock_data.USERS:
            db.merge(u)
        db.commit()

        print("Seeding Grades...")
        for g in mock_data.GRADES:
            db.merge(g)
        db.commit()

        print("Seeding Subjects...")
        for sub in mock_data.SUBJECTS:
            db.merge(sub)
        db.commit()

        print("Seeding Classes...")
        for c in mock_data.CLASSES:
            db.merge(c)
        db.commit()

        print("Seeding Students...")
        for stu in mock_data.STUDENTS_PROFILES:
            db.merge(stu)
        db.commit()

        print("Seeding Assignments...")
        for a in mock_data.ASSIGNMENTS:
            db.merge(a)
        db.commit()

        print("Seeding Submissions...")
        for sub in mock_data.SUBMISSIONS:
            db.merge(sub)
        db.commit()
        
        # Reset sequences (important because we forced IDs)
        print("Resetting sequences...")
        tables = ['schools', 'users', 'grades', 'subjects', 'classes', 'students', 'assignments', 'submissions']
        for t in tables:
            try:
                db.execute(text(f"SELECT setval(pg_get_serial_sequence('{t}', 'id'), coalesce(max(id)+1, 1), false) FROM {t};"))
            except Exception as e:
                print(f"Warning resetting sequence for {t}: {e}")
        db.commit()

        print("✅ Seeding Complete!")

    except Exception as e:
        print(f"❌ Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
