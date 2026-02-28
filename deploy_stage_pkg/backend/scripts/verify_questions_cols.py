import sqlite3
import os

DB_PATH = "learnmistschool.db"

def check_columns():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("PRAGMA table_info(questions)")
    columns = cursor.fetchall()
    
    col_names = [col[1] for col in columns]
    print(f"Columns in questions table: {col_names}")
    
    required = ["school_id", "subject_id", "class_id"]
    missing = [c for c in required if c not in col_names]
    
    if missing:
        print(f"FAILED: Missing columns: {missing}")
    else:
        print("SUCCESS: All required columns found.")

    conn.close()

if __name__ == "__main__":
    check_columns()
