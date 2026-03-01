import sqlite3

def check_user():
    conn = sqlite3.connect("learnmistschool.db")
    cursor = conn.cursor()
    
    email = "albertj@gmail.com"
    print(f"--- Checking User: {email} ---")
    cursor.execute("SELECT id, username, email, role, school_id FROM users WHERE email=? OR username=?", (email, email))
    user = cursor.fetchone()
    
    if user:
        print(f"User Found: {user}")
        
        # Check School
        cursor.execute("SELECT id, name FROM schools WHERE id=?", (user[4],))
        school = cursor.fetchone()
        print(f"School: {school}")
    else:
        print("User NOT found")

    conn.close()

if __name__ == "__main__":
    check_user()
