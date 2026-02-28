import sqlite3

def check_db():
    conn = sqlite3.connect('/home/balav/app/backend/learnmistschool.db')
    cursor = conn.cursor()
    
    print("--- USERS ---")
    cursor.execute("SELECT id, username, email, role FROM users")
    for row in cursor.fetchall():
        print(row)

    print("--- SCHOOLS ---")
    cursor.execute("SELECT id, name FROM schools")
    for row in cursor.fetchall():
        print(row)

    print("--- STUDENTS ---")
    cursor.execute("SELECT id, name, email FROM students")
    for row in cursor.fetchall():
        print(row)
        
    conn.close()

if __name__ == "__main__":
    check_db()
