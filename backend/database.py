from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Default to a local MySQL setup, but allow env var override
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+mysqlconnector://root:password@localhost/learnmistschool")

import time

# Mock engine bypass
class MockEngine:
    def connect(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

engine = MockEngine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False)

Base = declarative_base()

def get_db():
    # Yield a dummy session; actual operations should be mocked
    try:
        yield None
    finally:
        pass
