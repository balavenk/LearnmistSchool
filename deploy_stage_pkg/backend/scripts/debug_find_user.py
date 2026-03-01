import sqlite3

def find_user():
    conn = sqlite3.connect("learnmistschool.db")
    cursor = conn.cursor()
    
    print("--- Searching for 'sanjose' ---")
    cursor.execute("SELECT id, username, email, role FROM users WHERE username LIKE '%sanjose%' OR email LIKE '%sanjose%'")
    users = cursor.fetchall()
    
    for u in users:
        print(f"ID: {u[0]}, Username: '{u[1]}', Email: '{u[2]}', Role: {u[3]}")
        
    conn.close()

if __name__ == "__main__":
    find_user()
