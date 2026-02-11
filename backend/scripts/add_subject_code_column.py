from sqlalchemy import text
from database import engine

def add_subject_code_column():
    with engine.connect() as connection:
        try:
            # Check if column exists first (SQLite pragma)
            result = connection.execute(text("PRAGMA table_info(subjects);"))
            columns = [row[1] for row in result]
            
            if 'code' not in columns:
                print("Adding 'code' column to subjects table...")
                connection.execute(text("ALTER TABLE subjects ADD COLUMN code VARCHAR(20)"))
                print("Column added successfully.")
            else:
                print("Column 'code' already exists.")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    add_subject_code_column()
