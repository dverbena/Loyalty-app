from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
import logging
import os

# Initialize logger
logger = logging.getLogger(__name__)

# Define the Base class
Base = declarative_base()

DATABASE_URL = f'postgresql://{os.getenv("DB_USER", "admin")}:{os.getenv("DB_PASS", "admin_password")}@{os.getenv("DB_HOST", "localhost")}:{os.getenv("DB_PORT", "5432")}/{os.getenv("DB_NAME", "loyaltydb")}'

engine = create_engine(
    DATABASE_URL,
    pool_size=5,        # Default is 5;
    max_overflow=5,     # Allow 5 extra connections beyond pool size
    pool_timeout=30,    # Wait time in seconds for a connection
)

# Create session factory using the custom session class
SessionLocal = sessionmaker(bind=engine)

# Create a scoped session (thread-local)
db_session = scoped_session(SessionLocal)

def get_db():
    db = db_session()
    session_id = id(db)

    try:
        yield db
    finally:
        db.close()
        db_session.close()
        db_session.remove()

# Initialize the database (create tables)
def init_db(app=None):
    if app:
        # Bind the engine to the metadata of the Base class
        Base.metadata.create_all(bind=engine)