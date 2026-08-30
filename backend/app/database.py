from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# If no URL is provided (e.g. during some initial tests without .env), we can fallback or just let it fail on connect.
engine_url = settings.SUPABASE_DB_URL
if engine_url and engine_url.startswith("postgres://"):
    engine_url = engine_url.replace("postgres://", "postgresql://", 1)

if engine_url:
    engine = create_engine(engine_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
else:
    engine = None
    SessionLocal = None

Base = declarative_base()

def get_db():
    if SessionLocal is None:
        raise Exception("Database URL not configured")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
