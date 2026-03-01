import sqlite3

def list_users():
    conn = sqlite3.connect("learnmistschool.db")
    cursor = conn.cursor()
    
    print("--- Users in DB ---")
    cursor.execute("SELECT id, username, email, role, active FROM users")
    print(f"{'ID':<5} | {'Username':<20} | {'Email':<30} | {'Role':<15} | {'Active'}")
    print("-" * 80)
    users = cursor.fetchall()
    for u in users:
        # Handle None values safely
        uid, uname, email, role, active = u
        print(f"{uid:<5} | {str(uname):<20} | {str(email):<30} | {str(role):<15} | {active}")
        
    print(f"Total Users: {len(users)}")
    conn.close()

if __name__ == "__main__":
    list_users()
