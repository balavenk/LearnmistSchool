from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Default to a local MySQL setup, but allow env var override
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+mysqlconnector://root:password@localhost/learnmistschool")

import time

def get_engine(max_retries=5, delay=5):
    retries = 0
    while retries < max_retries:
        try:
            engine = create_engine(DATABASE_URL, pool_pre_ping=True)
            # Test connection
            with engine.connect() as connection:
                print("Database connection successful!")
                pass
            return engine
        except Exception as e:
            print(f"Database connection blocked... retrying in {delay} seconds. Error: {e}")
            time.sleep(delay)
            retries += 1
    raise Exception("Could not connect to database after several retries")

engine = get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
