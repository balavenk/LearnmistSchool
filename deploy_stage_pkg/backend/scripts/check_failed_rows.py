import sqlite3
import os

DB_PATH = "learnmistschool.db"

def check_specific():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check 167-171
    cursor.execute("SELECT id, text, school_id, subject_id, class_id, assignment_id FROM questions WHERE id BETWEEN 167 AND 171")
    rows = cursor.fetchall()
    
    print("Questions 167-171:")
    for row in rows:
        print(f"ID: {row[0]}, School: {row[2]}, Subject: {row[3]}, Class: {row[4]}, Assgn: {row[5]}")
        
    conn.close()

if __name__ == "__main__":
    check_specific()
