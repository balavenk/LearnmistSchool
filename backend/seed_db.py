from sqlalchemy.orm import Session
import database, models, auth

def seed():
    db = database.SessionLocal()
    try:
        if db.query(models.User).filter(models.User.username == "superadmin").first():
            print("Superadmin already exists.")
            return

        hashed_pwd = auth.get_password_hash("password123")
        super_admin = models.User(
            username="superadmin",
            email="superadmin@school.com",
            hashed_password=hashed_pwd,
            role=models.UserRole.SUPER_ADMIN,
            active=True
        )
        db.add(super_admin)
        db.commit()
        print("Superadmin created successfully: superadmin / password123")
    except Exception as e:
        print(f"Error seeding DB: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
