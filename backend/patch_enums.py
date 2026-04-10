import os
from dotenv import load_dotenv
import psycopg2

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url.startswith("postgresql+psycopg2://"):
    db_url = db_url.replace("postgresql+psycopg2://", "postgresql://")

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()
    for val in ['LONG_ANSWER', 'CASE_BASED', 'ESSAY', 'SHORT_ANSWER', 'TRUE_FALSE', 'MULTIPLE_CHOICE']:
        try:
            cur.execute(f"ALTER TYPE questiontype ADD VALUE IF NOT EXISTS '{val}';")
            print(f"Added {val} to questiontype.")
        except Exception as e:
            print(f"Error adding {val}: {e}")
    conn.close()
except Exception as e:
    print(f"Failed: {e}")
