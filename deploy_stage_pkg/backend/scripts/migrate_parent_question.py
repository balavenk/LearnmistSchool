import sqlite3
import os

DB_PATH = "learnmistschool.db"

def add_parent_col():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE questions ADD COLUMN parent_question_id INTEGER REFERENCES questions(id)")
        print("Added column parent_question_id")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e).lower():
            print("Column parent_question_id already exists")
        else:
            print(f"Error adding parent_question_id: {e}")
                
    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_parent_col()
