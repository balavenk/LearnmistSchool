from sqlalchemy import create_engine, text
import os

# Assuming sqlite for now based on previous context
DATABASE_URL = "sqlite:///./learnmistschool.db"

def upgrade():
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        try:
            # Check if column exists
            result = conn.execute(text("PRAGMA table_info(students)"))
            columns = [row[1] for row in result.fetchall()]
            
            if "user_id" not in columns:
                print("Adding user_id column to students table...")
                conn.execute(text("ALTER TABLE students ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                print("Column added successfully.")
            else:
                print("Column user_id already exists.")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    upgrade()
