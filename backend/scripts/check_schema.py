from sqlalchemy import text
from database import SessionLocal

db = SessionLocal()

def check_schema():
    print("--- Checking Schema ---")
    try:
        # SQLite specific pragma
        columns = db.execute(text("PRAGMA table_info(student_answers)")).fetchall()
        print(f"Columns for student_answers: {len(columns)}")
        for col in columns:
            print(col)
            
        columns_q = db.execute(text("PRAGMA table_info(assignments)")).fetchall()
        print(f"Columns for assignments: {len(columns_q)}")
        for col in columns_q:
            print(col)

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_schema()
