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

try:
    conn = psycopg2.connect(db_url)
    conn.autocommit = True
    cur = conn.cursor()

    try:
        cur.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'INDIVIDUAL';")
        print("Added INDIVIDUAL to userrole.")
    except Exception as e:
        print(f"Error adding enum value: {e}")

    try:
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR;")
        print("Added full_name column to users table.")
    except Exception as e:
        print(f"Error adding full_name column: {e}")

    try:
        cur.execute("UPDATE users SET full_name = username WHERE full_name IS NULL OR full_name = '';")
        print(f"Updated {cur.rowcount} users with full_name = username.")
    except Exception as e:
        print(f"Error updating full_name: {e}")

    conn.close()
    print("DB updates applied successfully.")
except Exception as e:
    print(f"Failed to connect and apply updates: {e}")
