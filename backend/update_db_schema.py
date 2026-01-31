from database import engine, Base
import models

def update_db():
    print("Creating new tables...")
    # This will create tables that don't exist (Question, QuestionOption)
    # It won't update existing tables (Assignment) unless we used migration tool, 
    # but we only added a relationship code-side to Assignment, so DB schema for Assignment is unchanged.
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

if __name__ == "__main__":
    update_db()
