from flask import Blueprint, request, jsonify
import jwt
import datetime
from app.db import execute_read_query # Assuming this is your DB helper
from app.auth.middleware import SECRET_KEY # Use the same key from your middleware!

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    # 1. Handle the CORS preflight check
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    # 2. Query the database for the user
    # Adjust the column names to match your actual USERS table schema
    sql = "SELECT user_id, password FROM USERS WHERE email_address = %s"
    result = execute_read_query(sql, (email,))

    # 3. Verify credentials
    # NOTE: This assumes plain text passwords for development. 
    # For production, you should use werkzeug.security.check_password_hash!
    if not result or result[0]['password'] != password:
        return jsonify({'error': 'Invalid email or password'}), 401
        
    user_id = result[0]['user_id']

    # 4. Generate the JWT token
    token = jwt.encode({
        'user_id': user_id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24) # Token lasts 24 hours
    }, SECRET_KEY, algorithm="HS256")

    # 5. Send the token back to React
    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user_id': user_id
    }), 200


"""
@auth_bp.route('/register', methods=['POST', 'OPTIONS'])
def register():
    if request.method == 'OPTIONS': return '', 200
    
    data = request.get_json()
    user_id = data.get('user_id')
    email = data.get('email_address')
    password = data.get('password')

    # Hash the password securely
    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')

    try:
        execute_write_query(
            "INSERT INTO USERS (user_id, email_address, password) VALUES (%s, %s, %s)",
            (user_id, email, hashed_password)
        )
        return jsonify({"message": "User registered successfully!"}), 201
    except Exception as e:
        return jsonify({"error": "User already exists or invalid data"}), 400


"""