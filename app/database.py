from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Define the Base class
Base = declarative_base()

DATABASE_URL = "postgresql://admin:admin_password@db:5432/loyaltydb"

engine = create_engine(DATABASE_URL)
metadata = MetaData()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize the database (create tables)
def init_db(app=None):
    if app:
        # Bind the engine to the metadata of the Base class
        Base.metadata.create_all(bind=engine)