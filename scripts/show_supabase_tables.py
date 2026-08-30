import os
import sys
from dotenv import load_dotenv
from sqlalchemy import inspect

# Load .env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

from app.database import engine, Base
from app.models import *

def check_and_create_tables():
    print("Checking Supabase PostgreSQL connection...")
    print(f"Target DB host: {engine.url.host if engine else 'None'}")
    
    if not engine:
        print("Error: SUPABASE_DB_URL is not configured in .env file.")
        return

    try:
        # Create all tables if they don't exist yet
        print("Creating tables in Supabase if not present...")
        Base.metadata.create_all(bind=engine)
        
        # Inspect created tables
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        print("\n==========================================")
        print(" TABLES CURRENTLY IN SUPABASE DATABASE")
        print("==========================================")
        if tables:
            for idx, table_name in enumerate(sorted(tables), 1):
                columns = [c['name'] for c in inspector.get_columns(table_name)]
                print(f"{idx:02d}. Table: {table_name:<20} Columns ({len(columns)}): {', '.join(columns)}")
        else:
            print("No tables found in public schema.")
        print("==========================================\n")
        
    except Exception as e:
        print(f"\nFailed to connect/query Supabase: {e}")

if __name__ == "__main__":
    check_and_create_tables()
