from database import engine
from sqlalchemy import text

def add_column():
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE file_artifacts ADD COLUMN file_metadata TEXT"))
            conn.commit()
        print("Column 'file_metadata' added successfully.")
    except Exception as e:
        print(f"Error adding column: {e}")

if __name__ == "__main__":
    add_column()
