import os
import time
from sqlalchemy import create_engine, text
import bcrypt

# Hardcoded container credentials (from docker-compose)
DATABASE_URL = "mysql+mysqlconnector://user:password@db/learnmistschool"

def wait_for_db():
    retries = 0
    while retries < 10:
        try:
            engine = create_engine(DATABASE_URL)
            with engine.connect() as conn:
                return engine
        except Exception:
            print("Waiting for DB...")
            time.sleep(2)
            retries += 1
    raise Exception("DB unreachable")

def fix_admin():
    print("Connecting to DB...")
    engine = wait_for_db()
    
    # Use bcrypt directly to avoid passlib limitation/bug
    password = b"admin123"
    hashed = bcrypt.hashpw(password, bcrypt.gensalt()).decode('utf-8')
    
    with engine.connect() as conn:
        print("Checking superadmin...")
        result = conn.execute(text("SELECT username FROM users WHERE username='superadmin'"))
        if result.fetchone():
            print("User exists. Updating password...")
            conn.execute(text("UPDATE users SET hashed_password=:h, role='SUPER_ADMIN', active=1 WHERE username='superadmin'"), {"h": hashed})
        else:
            print("User missing. Creating superadmin...")
            # Note: school_id is nullable
            conn.execute(text("INSERT INTO users (username, hashed_password, role, active, school_id) VALUES ('superadmin', :h, 'SUPER_ADMIN', 1, NULL)"), {"h": hashed})
        conn.commit()
    print("Success: superadmin / admin123")

if __name__ == "__main__":
    fix_admin()
