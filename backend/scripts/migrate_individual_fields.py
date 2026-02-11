import sqlite3
import os

DB_PATH = "learnmistschool.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Migrating students table to support nullable school_id and grade_id...")
    
    try:
        # 1. Rename existing table
        cursor.execute("PRAGMA foreign_keys=OFF")
        cursor.execute("ALTER TABLE students RENAME TO students_old")
        
        # 2. Create new table with nullable columns
        # Note: We must recreate exact schema but with nullable changes
        # Original: 
        # id INTEGER PRIMARY KEY, name VARCHAR(100), active BOOLEAN, school_id INTEGER FK, grade_id INTEGER FK, class_id INTEGER FK, user_id INTEGER FK
        
        create_sql = """
        CREATE TABLE students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100),
            active BOOLEAN DEFAULT 1,
            school_id INTEGER,
            grade_id INTEGER,
            class_id INTEGER,
            user_id INTEGER,
            FOREIGN KEY(school_id) REFERENCES schools(id),
            FOREIGN KEY(grade_id) REFERENCES grades(id),
            FOREIGN KEY(class_id) REFERENCES classes(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )
        """
        cursor.execute(create_sql)
        
        # 3. Copy data
        cursor.execute("INSERT INTO students (id, name, active, school_id, grade_id, class_id, user_id) SELECT id, name, active, school_id, grade_id, class_id, user_id FROM students_old")
        
        # 4. Drop old table
        cursor.execute("DROP TABLE students_old")
        
        cursor.execute("PRAGMA foreign_keys=ON")
        
        # 5. Create indices if needed (SQLAlchemy does this usually, but good to preserve)
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_students_id ON students (id)")
        
        conn.commit()
        print("Migration successful.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
