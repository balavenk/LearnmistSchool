import sqlite3

def migrate():
    conn = sqlite3.connect("learnmistschool.db")
    cursor = conn.cursor()
    
    columns = [
        ("exam_type", "VARCHAR(50)"),
        ("question_count", "INTEGER"),
        ("difficulty_level", "VARCHAR(20)"),
        ("question_type", "VARCHAR(50)")
    ]
    
    print("Migrating assignments table...")
    for col, dtype in columns:
        try:
            cursor.execute(f"ALTER TABLE assignments ADD COLUMN {col} {dtype}")
            print(f"Added column {col}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e):
                print(f"Column {col} already exists")
            else:
                print(f"Error adding {col}: {e}")
                
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
