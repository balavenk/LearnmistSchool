import sqlite3
import os

DB_PATH = "learnmistschool.db"

def check_recent_questions():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, text, school_id, subject_id, class_id FROM questions ORDER BY id DESC LIMIT 5")
    rows = cursor.fetchall()
    
    print("Recent Questions:")
    for row in rows:
        print(f"ID: {row[0]}, Text: {row[1][:20]}..., School: {row[2]}, Subject: {row[3]}, Class: {row[4]}")
        
    conn.close()

if __name__ == "__main__":
    check_recent_questions()
