import sqlite3
import os

DB_PATH = "learnmistschool.db"

def add_columns():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    columns = [
        ("school_id", "INTEGER REFERENCES schools(id)"),
        ("subject_id", "INTEGER REFERENCES subjects(id)"),
        ("class_id", "INTEGER REFERENCES classes(id)")
    ]
    
    for col_name, col_def in columns:
        try:
            cursor.execute(f"ALTER TABLE questions ADD COLUMN {col_name} {col_def}")
            print(f"Added column {col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                print(f"Column {col_name} already exists")
            else:
                print(f"Error adding {col_name}: {e}")
                
    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_columns()
