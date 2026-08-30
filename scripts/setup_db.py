import os
import sys
from dotenv import load_dotenv

# load environment variables before importing anything else
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from app.database import engine, Base
from app.models import *

def init_db():
    try:
        print(f"Connecting to {engine.url}")
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully.")
    except Exception as e:
        print(f"Error creating database tables: {e}")

if __name__ == "__main__":
    init_db()
