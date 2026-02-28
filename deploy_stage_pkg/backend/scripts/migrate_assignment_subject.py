import sqlite3
import os

DB_PATH = "learnmistschool.db"

def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database {DB_PATH} not found.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    print("Migrating assignments table to support nullable subject_id...")
    
    try:
        # 1. Rename existing table
        cursor.execute("PRAGMA foreign_keys=OFF")
        cursor.execute("ALTER TABLE assignments RENAME TO assignments_old")
        
        # 2. Create new table with nullable subject_id
        # Original:
        # id INTEGER PRIMARY KEY, title VARCHAR(100), description TEXT, due_date DATETIME, 
        # status VARCHAR(10), teacher_id INTEGER FK, class_id INTEGER FK, subject_id INTEGER FK
        
        create_sql = """
        CREATE TABLE assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title VARCHAR(100),
            description TEXT,
            due_date DATETIME,
            status VARCHAR(10),
            teacher_id INTEGER,
            class_id INTEGER,
            subject_id INTEGER,
            FOREIGN KEY(teacher_id) REFERENCES users(id),
            FOREIGN KEY(class_id) REFERENCES classes(id),
            FOREIGN KEY(subject_id) REFERENCES subjects(id)
        )
        """
        cursor.execute(create_sql)
        
        # 3. Copy data
        cursor.execute("INSERT INTO assignments (id, title, description, due_date, status, teacher_id, class_id, subject_id) SELECT id, title, description, due_date, status, teacher_id, class_id, subject_id FROM assignments_old")
        
        # 4. Drop old table
        cursor.execute("DROP TABLE assignments_old")
        
        cursor.execute("PRAGMA foreign_keys=ON")
        
        # 5. Create indices (Optional but good practice)
        cursor.execute("CREATE INDEX IF NOT EXISTS ix_assignments_id ON assignments (id)")
        
        conn.commit()
        print("Migration successful.")
        
    except Exception as e:
        print(f"Migration failed: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
