from database import engine
from sqlalchemy import text

def migrate():
    with engine.connect() as conn:
        print("Migrating schools table...")
        try:
            conn.execute(text("ALTER TABLE schools ADD COLUMN country_id INTEGER REFERENCES countries(id)"))
            print("Added country_id")
        except Exception as e:
            print(f"could not add country_id (maybe exists): {e}")

        try:
             conn.execute(text("ALTER TABLE schools ADD COLUMN curriculum_id INTEGER REFERENCES curriculums(id)"))
             print("Added curriculum_id")
        except Exception as e:
            print(f"could not add curriculum_id (maybe exists): {e}")

        try:
             conn.execute(text("ALTER TABLE schools ADD COLUMN school_type_id INTEGER REFERENCES school_types(id)"))
             print("Added school_type_id")
        except Exception as e:
            print(f"could not add school_type_id (maybe exists): {e}")
            
        conn.commit()
        print("Migration complete.")

if __name__ == "__main__":
    migrate()
