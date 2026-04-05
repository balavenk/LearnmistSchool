from app.database import get_engine
from sqlalchemy import text

engine = get_engine()
queries = [
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS grade_id INTEGER;",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS file_artifact_id INTEGER;",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_bank_question BOOLEAN DEFAULT FALSE;",
    "ALTER TABLE questions ADD COLUMN IF NOT EXISTS is_answered BOOLEAN DEFAULT FALSE;"
]

with engine.begin() as conn:
    for q in queries:
        try:
            conn.execute(text(q))
            print("Successfully executed:", q)
        except Exception as e:
            print("Failed or skipped:", q, "Error:", str(e))
