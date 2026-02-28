import sqlite3

def find_sanj():
    conn = sqlite3.connect("learnmistschool.db")
    cursor = conn.cursor()
    
    print("--- Searching for 'sanj' ---")
    cursor.execute("SELECT id, username, email, role FROM users WHERE username = 'sanj' OR email = 'sanj'")
    users = cursor.fetchall()
    
    if not users:
        print("No user found with username or email 'sanj'")
    else:
        for u in users:
            print(f"Found: ID: {u[0]}, Username: '{u[1]}', Email: '{u[2]}', Role: {u[3]}")
        
    conn.close()

if __name__ == "__main__":
    find_sanj()
