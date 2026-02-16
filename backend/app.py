#from flask import Flask
#import psycopg

#app = Flask(__name__)

# Database connection configuration
#DB_CONFIG = {
 #   'host': 'localhost',
  #  'port': 5432,
   #'user': 'hallmate_user',
    #'password': 'hallmate123'
#}

#def get_db_connection():
 #   try:
  #      conn = psycopg.connect(**DB_CONFIG)
   #     print("Database connection established!")
    #    return conn
    #except Exception as e:
     #   print("Error connecting to the database:", e)
      #  return None

#@app.route("/")
#def index():
 #   conn = get_db_connection()
  #  if conn:
   #     conn.close()
    #    return "Connected to the database!"
    #else:
     #   return "Failed to connect to the database."

#if __name__ == "__main__":
 #   app.run(debug=True)
from app import create_app

app = create_app()

if __name__ == "__main__":
    # debug=True allows the server to auto-reload when you save code changes
    app.run(debug=True, port=5000)
