import sqlite3
import os

DB_PATH = "learnmistschool.db"

def check_difficulty():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute("PRAGMA table_info(questions)")
    cols = [c[1] for c in cursor.fetchall()]
    if "difficulty_level" not in cols:
        print("FAIL: difficulty_level column missing")
    else:
        print("SUCCESS: difficulty_level column exists")

    conn.close()

if __name__ == "__main__":
    check_difficulty()
