import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
import traceback
import os
from dotenv import load_dotenv

load_dotenv()

DB_URL = f"postgresql://{os.getenv('DB_USER')}:{os.getenv('DB_PSWD')}@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}"

engine = create_engine(
    DB_URL,
    pool_size=20,
    max_overflow=10,
    pool_recycle=3600,
    pool_pre_ping=True
)

def execute_query(sql_query: str, params: dict = None):
    try:
        with engine.connect() as connection:
            result = connection.execute(text(sql_query), params or {})
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            return df.to_dict(orient='records')
    except Exception as e:
        traceback.print_exc()
        raise e

def execute_statement(sql_query: str, params: dict = None):
    try:
        with engine.begin() as connection:
            result = connection.execute(text(sql_query), params or {})
            return result.rowcount
    except Exception as e:
        traceback.print_exc()
        raise e

def execute_insert_returning(sql_query: str, params: dict = None):
    """Utility to execute an insert statement and return fetched rows"""
    try:
        with engine.begin() as connection:
            result = connection.execute(text(sql_query), params or {})
            df = pd.DataFrame(result.fetchall(), columns=result.keys())
            return df.to_dict(orient='records')
    except Exception as e:
        traceback.print_exc()
        raise e