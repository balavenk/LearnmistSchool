import sqlite3
import os

DB_PATH = "learnmistschool.db"

def add_diff_col():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE questions ADD COLUMN difficulty_level VARCHAR(50)")
        print("Added column difficulty_level")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("Column difficulty_level already exists")
        else:
            print(f"Error adding difficulty_level: {e}")
                
    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_diff_col()
