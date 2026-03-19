from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import time
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg2://mist_user:mist_pass@127.0.0.1:5440/learnmistschool"
)


def get_engine(max_retries=60, delay=2):
    retries = 0
    while retries < max_retries:
        try:
            engine = create_engine(
                DATABASE_URL,
                pool_pre_ping=True,              # Discard stale connections before use
                pool_reset_on_return="rollback", # Always rollback on connection return
            )
            # Test connection
            with engine.connect() as connection:
                print("Database connection successful!")
            return engine
        except Exception as e:
            print(f"Database connection blocked... retrying in {delay} seconds. Error: {e}")
            time.sleep(delay)
            retries += 1
    raise Exception("Could not connect to database after several retries")


_engine = None
SessionLocal = None


def get_session_local():
    global _engine, SessionLocal
    if _engine is None:
        _engine = get_engine()
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_engine)
    return SessionLocal()


Base = declarative_base()


def get_db():
    db = get_session_local()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
