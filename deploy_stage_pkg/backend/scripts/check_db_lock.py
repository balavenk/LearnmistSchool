import sqlite3
import time

def check_db():
    try:
        conn = sqlite3.connect("learnmistschool.db", timeout=5)
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        print("DB Connection OK")
        conn.close()
    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    check_db()
