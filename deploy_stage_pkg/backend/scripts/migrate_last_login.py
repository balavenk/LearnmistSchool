import sqlite3

def migrate():
    print("Migrating users table to add last_login column...")
    conn = sqlite3.connect("learnmistschool.db")
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE users ADD COLUMN last_login DATETIME")
        print("Column 'last_login' added successfully.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e):
            print("Column 'last_login' already exists.")
        else:
            print(f"Error adding column: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
