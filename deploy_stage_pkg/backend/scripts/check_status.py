from database import SessionLocal
from app import models
from sqlalchemy import text

def check_status():
    db = SessionLocal()
    try:
        # 1. Connection Check
        db.execute(text("SELECT 1"))
        print("\n✅ DATABASE CONNECTION: ACTIVE")
        
        # 2. Data Validation
        user_count = db.query(models.User).count()
        school_count = db.query(models.School).count()
        assignment_count = db.query(models.Assignment).count()
        
        print("\n📊 CURRENT DATA STATISTICS:")
        print(f"   - Schools:     {school_count}")
        print(f"   - Users:       {user_count}")
        print(f"   - Assignments: {assignment_count}")
        
        # 3. List some users
        print("\n👥 RECENT USERS:")
        users = db.query(models.User).limit(5).all()
        for u in users:
            print(f"   - {u.username} ({u.role.value})")
            
    except Exception as e:
        print(f"\n❌ CONNECTION FAILED: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    check_status()
