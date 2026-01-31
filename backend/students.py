from flask import Flask
import psycopg2

app = Flask(__name__)

DB_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'dbname': 'hallmate_db',
    'user': 'hallmate_user',
    'password': 'hallmate123'
}

def get_db_connection():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print("Error connecting to the database:", e)
        return None

@app.route("/students")
def show_students():
    conn = get_db_connection()
    if not conn:
        return "Failed to connect to the database."
    
    cur = conn.cursor()
    cur.execute("SELECT * FROM students;")  
    rows = cur.fetchall()  # Fetch all rows from the table
    cur.close()
    conn.close()
    
    
    output = "<h2>Students Table</h2><ul>"
    for row in rows:
        output += f"<li>{row}</li>"
    output += "</ul>"
    return output

if __name__ == "__main__":
    app.run(debug=True)
