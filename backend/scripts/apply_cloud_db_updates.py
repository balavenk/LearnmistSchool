import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
if not db_url:
    print("No DATABASE_URL found.")
    exit(1)

# fix psycopg2 scheme if it's postgresql+psycopg2
if db_url.startswith("postgresql+psycopg2://"):
    db_url = db_url.replace("postgresql+psycopg2://", "postgresql://")

# 1. Create missing tables using SQLAlchemy
try:
    from sqlalchemy import create_engine
    # To use standard postgresql URL with psycopg2
    engine_url = db_url.replace("postgresql://", "postgresql+psycopg2://") if db_url.startswith("postgresql://") else db_url
    engine = create_engine(engine_url)
    
    # Needs to be imported inside app context where paths resolve
    import sys
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from app.models import Base
    
    Base.metadata.create_all(bind=engine)
    print("SQLAlchemy create_all completed successfully.")
except Exception as e:
    print(f"Error running create_all: {e}")

# 2. Run explicit ALTERs for existing tables columns
queries = [
    "ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'INDIVIDUAL';",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR;",
    "UPDATE users SET full_name = username WHERE full_name IS NULL OR full_name = '';",
    
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_year VARCHAR(20);",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS source_type VARCHAR(50);",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS bloom_level VARCHAR(50);",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS chapter_name VARCHAR(255);",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS passage TEXT;",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS sub_questions TEXT;",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS answer_key TEXT;",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_answer TEXT;",
    
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS grade_id INTEGER;",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS file_artifact_id INTEGER;",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_bank_question BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_answered BOOLEAN DEFAULT FALSE;",
    
    "ALTER TABLE assignments ADD COLUMN IF NOT EXISTS generation_type VARCHAR(50) DEFAULT 'Manual';",
    
    "ALTER TABLE file_artifacts ADD COLUMN IF NOT EXISTS is_question_bank BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE file_artifacts ADD COLUMN IF NOT EXISTS year INTEGER;",
    
    "ALTER TYPE questiontype ADD VALUE IF NOT EXISTS 'LONG_ANSWER';",
    "ALTER TYPE questiontype ADD VALUE IF NOT EXISTS 'CASE_BASED';",
    "ALTER TYPE questiontype ADD VALUE IF NOT EXISTS 'ESSAY';",
    "ALTER TYPE questiontype ADD VALUE IF NOT EXISTS 'SHORT_ANSWER';",
    "ALTER TYPE questiontype ADD VALUE IF NOT EXISTS 'TRUE_FALSE';",
    "ALTER TYPE questiontype ADD VALUE IF NOT EXISTS 'MULTIPLE_CHOICE';"
]

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    for q in queries:
        try:
            cur.execute(q)
            print("Successfully executed:", q)
        except Exception as e:
            print(f"Skipped/Error on {q[:40]}...: {e}")

    conn.close()
    print("DB updates applied successfully.")
except Exception as e:
    print(f"Failed to connect and apply updates: {e}")
