from database import engine, Base
from models import FileArtifact
from sqlalchemy import text

def recreate_file_artifacts():
    print("Dropping file_artifacts table...")
    with engine.connect() as conn:
        conn.execute(text("DROP TABLE IF EXISTS file_artifacts"))
        conn.commit()
    
    print("Creating all tables (will recreate file_artifacts)...")
    Base.metadata.create_all(bind=engine)
    print("Done.")

if __name__ == "__main__":
    recreate_file_artifacts()
