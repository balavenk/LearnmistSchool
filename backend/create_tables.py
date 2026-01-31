from database import engine
import models

def create_tables():
    print("Creating tables...")
    models.Base.metadata.create_all(bind=engine)
    print("Tables created.")

if __name__ == "__main__":
    create_tables()
