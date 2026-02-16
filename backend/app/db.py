import psycopg
from psycopg.rows import dict_row
import os

# --- DATABASE CONFIGURATION ---
# You can hardcode these for now, or use os.getenv() if you have a .env file
DB_HOST = "localhost"
DB_NAME = "hallmate_db" # Make sure this matches your DB name
DB_USER = "hallmate_user"
DB_PASSWORD = "hallmate123" # UPDATE THIS

def get_db_connection():
    """Establishes a connection to the database."""
    conn_str = f"host={DB_HOST} dbname={DB_NAME} user={DB_USER} password={DB_PASSWORD}"
    # row_factory=dict_row makes results look like {'name': 'John', 'id': 1}
    conn = psycopg.connect(conn_str, row_factory=dict_row)
    return conn

def execute_read_query(query, params=None):
    """
    Used for SELECT (or INSERT...RETURNING).
    Opens connection, runs query, gets results, commits (if needed), and closes.
    """
    try:
        # 'with' automatically closes the connection
        with get_db_connection() as conn:
            # 'with' automatically closes the cursor
            with conn.cursor() as cur:
                cur.execute(query, params)
                result = cur.fetchall()
                # in psycopg 3, the context manager commits automatically if no error
                return result
    except Exception as e:
        print(f"Error executing read query: {e}")
        return []

def execute_write_query(query, params=None):
    """
    Used for INSERT, UPDATE, DELETE.
    Returns True if successful, False otherwise.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                # Transaction is automatically committed here when block ends
        return True
    except Exception as e:
        print(f"Error executing write query: {e}")
        return False