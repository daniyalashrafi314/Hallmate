from flask import Blueprint, request, jsonify
import jwt
import datetime
from app.db import execute_read_query 
from app.auth.middleware import SECRET_KEY, determine_role 
from app.security.passwords import verify_password


auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
@auth_bp.route('/login', methods=['POST', 'OPTIONS'])
def login():
    # 1. Handle the CORS preflight check
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.get_json()
    
    # --- CHANGED: Extract user_id instead of email ---
    user_id_input = data.get('user_id') 
    password = data.get('password')

    if not user_id_input or not password:
        return jsonify({'error': 'User ID and password are required'}), 400

    # --- CHANGED: Query by user_id ---
    sql = "SELECT user_id, password FROM USERS WHERE user_id = %s"
    result = execute_read_query(sql, (user_id_input,))

    if not result or not verify_password(result[0]['password'], password):
        return jsonify({'error': 'Invalid User ID or password'}), 401
        
    user_id = result[0]['user_id']
    
    # --- CHANGED: Determine role dynamically ---
    # (Make sure your updated determine_role function is accessible here)
    user_role = determine_role(user_id)

    token = jwt.encode({
        'user_id': user_id,
        'role': user_role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }, SECRET_KEY, algorithm="HS256")

    return jsonify({
        'message': 'Login successful',
        'token': token,
        'user_id': user_id,
        'role': user_role 
    }), 200