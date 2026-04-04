import jwt
from functools import wraps
from flask import request, jsonify
from app.db import execute_read_query

SECRET_KEY = "super_secret_hallmate_key_123"

def determine_role(user_id):
    """Helper function to determine role based on database records"""
    user_id = str(user_id).strip()

    # 1. Check if Staff or Provost (Database Lookup)
    staff_query = "SELECT role FROM STAFFS WHERE user_id = %s"
    staff_record = execute_read_query(staff_query, (user_id,))

    if staff_record:
        staff_role = staff_record[0].get('role')
        if staff_role == 'Provost':
            return 'admin'
        return 'staff'

    # 2. Check if Student (Database Lookup)
    student_query = "SELECT student_id FROM STUDENTS WHERE user_id = %s"
    student_record = execute_read_query(student_query, (user_id,))

    if student_record:
        return 'student'

    # 3. Check if Super User (Exists in USERS, but wasn't caught by Staff or Student checks)
    user_query = "SELECT user_id FROM USERS WHERE user_id = %s"
    user_record = execute_read_query(user_query, (user_id,))

    if user_record:
        return 'super_user'

    return 'unknown'

def token_required(allowed_roles=None):
    """
    Decorator to protect routes. 
    Pass a list of roles like: @token_required(allowed_roles=['admin', 'staff'])
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            # 1. Allow CORS Preflight checks to pass
            if request.method == 'OPTIONS':
                return f(*args, **kwargs)

            # 2. Extract Token
            token = None
            if 'Authorization' in request.headers:
                parts = request.headers['Authorization'].split()
                if len(parts) == 2 and parts[0] == 'Bearer':
                    token = parts[1]

            if not token:
                return jsonify({'error': 'Token is missing! Access Denied.'}), 401

            try:
                # 3. Decode Token
                data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                current_user_id = data['user_id']
                token_role = data.get('role')

                # 4. Check Authorization (Role-Based Access)
                user_role = token_role if token_role else determine_role(current_user_id)
                if not token_role:
                    user_role = determine_role(current_user_id)

                if allowed_roles and user_role not in allowed_roles:
                    return jsonify({
                        'error': f'Unauthorized! This area is restricted. You are a {user_role}.'
                    }), 403

                # Attach variables for the route to use
                request.current_user_id = current_user_id
                request.current_user_role = user_role

            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Token has expired! Please log in again.'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Token is invalid!'}), 401

            # 5. EXECUTE THE ROUTE (This prevents the "did not return a valid response" error)
            return f(*args, **kwargs)
            
        return decorated
    return decorator