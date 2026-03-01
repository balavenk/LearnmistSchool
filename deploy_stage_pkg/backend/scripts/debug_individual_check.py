import sqlite3

def check_db():
    conn = sqlite3.connect("learnmistschool.db")
    cursor = conn.cursor()
    
    print("--- Schools ---")
    cursor.execute("SELECT id, name FROM schools WHERE name='Individual'")
    res = cursor.fetchall()
    print(res)
    
    print("--- Assignment Table Info ---")
    cursor.execute("PRAGMA table_info(assignments)")
    cols = cursor.fetchall()
    for c in cols:
        print(c)

    conn.close()

if __name__ == "__main__":
    check_db()
