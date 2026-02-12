"""
Add email column to students table
Run: python scripts/add_email_column.py
"""
import sqlite3
import os

# Get database path
db_path = os.path.join(os.path.dirname(__file__), '..', 'learnmistschool.db')

print(f"Connecting to database: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if column already exists
    cursor.execute("PRAGMA table_info(students)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'email' in columns:
        print("✓ Email column already exists in students table")
    else:
        # Add email column
        cursor.execute("ALTER TABLE students ADD COLUMN email VARCHAR(255)")
        conn.commit()
        print("✅ Successfully added email column to students table")
    
    conn.close()
    print("\n✅ Database migration completed!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    if conn:
        conn.close()
