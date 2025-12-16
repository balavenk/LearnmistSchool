from . import database, models, auth

def seed():
    db = database.SessionLocal()
    try:
        # Check if superadmin exists
        existing = db.query(models.User).filter(models.User.username == "superadmin").first()
        if existing:
            print("Super Admin already exists.")
            return

        hashed_pwd = auth.get_password_hash("admin123")
        user = models.User(
            username="superadmin", 
            hashed_password=hashed_pwd, 
            role=models.UserRole.SUPER_ADMIN, 
            school_id=None
        )
        db.add(user)
        db.commit()
        print("Super Admin created: superadmin / admin123")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
