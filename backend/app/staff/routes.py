# app/staff/routes.py
from flask import request, jsonify
from . import staff_bp
from app.db import execute_read_query, execute_write_query

# MOCK ID for development (Replace with session logic later)
CURRENT_STAFF_ID = 'S-101'

from flask import Blueprint, request, jsonify
from app.db import execute_read_query, execute_write_query

# 1. Define the Blueprint
# This tells Flask: "All URLs defined here belong to the 'staff' section"
staff_bp = Blueprint('staff', __name__)

# --- MOCK DATA ---
# In a real app, you would get this from `session['user_id']` after login.
# For now, we hardcode it to test the database queries.
CURRENT_STAFF_ID = 'STF0000001' 


# --- 1) STAFF PROFILE PAGE ---
@staff_bp.route('/profile', methods=['GET'])
def get_profile():
    # We join STAFFS and USERS to get all details including email
    sql = """
        SELECT s.staff_id, s.name, s.phone_number, s.role, s.hall_id, u.email_address 
        FROM STAFFS s
        JOIN USERS u ON s.user_id = u.user_id
        WHERE s.staff_id = %s
    """
    # We pass a tuple (CURRENT_STAFF_ID,) to safely insert the variable into SQL
    profile = execute_read_query(sql, (CURRENT_STAFF_ID,))
    
    if profile:
        return jsonify(profile[0])
    return jsonify({"error": "Staff not found"}), 404


# --- 2) NOTICE PAGE (View & Create) ---
@staff_bp.route('/notices', methods=['GET', 'POST'])
def manage_notices():
    if request.method == 'GET':
        # View all notices ordered by newest first
        sql = "SELECT * FROM NOTICE ORDER BY created_at DESC"
        notices = execute_read_query(sql)
        return jsonify(notices)

    if request.method == 'POST':
        # Create a new notice
        data = request.get_json()
        title = data.get('title')
        description = data.get('description')
        
        sql = """
            INSERT INTO NOTICE (staff_id, title, description)
            VALUES (%s, %s, %s)
        """
        success = execute_write_query(sql, (CURRENT_STAFF_ID, title, description))
        
        if success:
            return jsonify({"message": "Notice published successfully"}), 201
        return jsonify({"error": "Failed to publish notice"}), 500


# --- 3) MY PAYMENTS (Salary) ---
@staff_bp.route('/my-payments', methods=['GET'])
def get_my_payments():
    # See salary payments specifically linked to this staff member
    sql = """
        SELECT p.payment_id, p.amount, p.status, p.paid_at, p.due_time
        FROM PAYMENTS p
        JOIN SALARY s ON p.payment_id = s.payment_id
        WHERE s.staff_id = %s
    """
    payments = execute_read_query(sql, (CURRENT_STAFF_ID,))
    return jsonify(payments)


# --- 4) ASK FOR DONATIONS ---
@staff_bp.route('/donations', methods=['POST'])
def create_donation():
    data = request.get_json()
    description = data.get('description')
    end_date = data.get('end_date') # Format: 'YYYY-MM-DD'

    # Note: Complex transaction (Insert Donation -> Get ID -> Insert Asks_For)
    # Ideally, use a stored procedure or transaction block in db.py.
    # For simplicity here, we do it in two steps (logic handled in Python):
    
    # Step 1: Insert Donation
    # We need the ID of the row we just inserted. 
    # execute_read_query is used here because 'RETURNING' acts like a SELECT.
    sql_step1 = """
        INSERT INTO DONATIONS (description, end_date) 
        VALUES (%s, %s) RETURNING donation_id
    """
    
    # We call execute_read_query here to capture the returned ID
    result_step1 = execute_read_query(sql_step1, (description, end_date))
    
    if result_step1:
        new_donation_id = result_step1[0]['donation_id']
        
        # Step 2: Link Staff to Donation
        sql_step2 = """
            INSERT INTO ASKS_FOR (donation_id, staff_id) 
            VALUES (%s, %s)
        """
        # We call execute_write_query here because we don't need a result
        success_step2 = execute_write_query(sql_step2, (new_donation_id, CURRENT_STAFF_ID))
        
        if success_step2:
            return jsonify({"message": "Donation request created", "id": new_donation_id}), 201

    return jsonify({"error": "Failed to create donation"}), 500


# --- 5) ADD PAYMENTS TO STUDENTS (Bulk) ---
@staff_bp.route('/assign-fees', methods=['POST'])
def assign_fees():
    data = request.get_json()
    student_ids = data.get('student_ids') # Expected: ['2305108', '2305109']
    amount = data.get('amount')
    payment_type = data.get('type') # e.g., 'Mess Due'
    due_date = data.get('due_date')

    # Note: Bulk insert. In a real app, use a transaction block.
    # Here, we iterate (simple but slower for thousands of records).
    
    success_count = 0
    
    for sid in student_ids:
        # 1. Create Payment entry and get ID
        sql_step1 = """
            INSERT INTO PAYMENTS (payment_type, amount, due_time, status)
            VALUES (%s, %s, %s, 'Due') RETURNING payment_id
        """
        result_step1 = execute_read_query(sql_step1, (payment_type, amount, due_date))
        
        if result_step1:
            pid = result_step1[0]['payment_id']

            # 2. Link to Student in FEES table
            sql_step2 = """
                INSERT INTO FEES (payment_id, student_id)
                VALUES (%s, %s)
            """
            success_step2 = execute_write_query(sql_step2, (pid, sid))
            if success_step2:
                success_count += 1
    
    return jsonify({"message": f"Fees assigned to {success_count} students"}), 201


# --- 6) EVENTS (Add/Delete/View) ---
@staff_bp.route('/events', methods=['GET', 'POST'])
def manage_events():
    if request.method == 'GET':
        sql = "SELECT * FROM EVENTS ORDER BY date"
        return jsonify(execute_read_query(sql))

    if request.method == 'POST':
        data = request.get_json()
        name = data.get('name')
        description = data.get('description')
        date = data.get('date')
        hall_id = data.get('hall_id')
        
        sql = """
            INSERT INTO EVENTS (name, description, date, hall_id) 
            VALUES (%s, %s, %s, %s)
        """
        success = execute_write_query(sql, (name, description, date, hall_id))
        if success:
            return jsonify({"message": "Event created"}), 201
        return jsonify({"error": "Failed"}), 500


# --- 7) REVIEW SEAT APPLICATIONS ---
@staff_bp.route('/seat-applications', methods=['GET'])
def get_applications():
    # Join with Students to show names
    sql = """
        SELECT sa.*, s.name as student_name 
        FROM SEAT_APPLICATION sa
        JOIN STUDENTS s ON sa.student_id = s.student_id
        WHERE sa.status = 'Pending'
    """
    return jsonify(execute_read_query(sql))


@staff_bp.route('/seat-applications/<int:app_id>/priority', methods=['PUT'])
def set_priority(app_id):
    data = request.get_json()
    new_priority = data.get('priority_value')
    
    sql = "UPDATE SEAT_APPLICATION SET priority_value = %s WHERE application_id = %s"
    success = execute_write_query(sql, (new_priority, app_id))
    
    if success:
        return jsonify({"message": "Priority updated"})
    return jsonify({"error": "Failed"}), 400


# --- 8) STUDENT LIST & SEARCH ---
@staff_bp.route('/students', methods=['GET'])
def search_students():
    # URL parameters: /students?query=ali&type=name
    query_param = request.args.get('query', '')
    search_type = request.args.get('type', 'name') # 'name', 'id', or 'room'

    # Base query for all cases
    base_sql = """
        SELECT s.student_id, s.name, s.phone_number, s.status, a.room_id 
        FROM STUDENTS s
        LEFT JOIN ALLOCATIONS a ON s.student_id = a.student_id
    """
    
    sql_query = ""
    params = ()
    
    if search_type == 'room':
        sql_query = base_sql + " WHERE a.room_id = %s"
        params = (query_param,)
    elif search_type == 'id':
        sql_query = base_sql + " WHERE s.student_id = %s"
        params = (query_param,)
    else:
        # Default search by name (partial match, case-insensitive)
        sql_query = base_sql + " WHERE s.name ILIKE %s"
        params = (f"%{query_param}%",)

    results = execute_read_query(sql_query, params)
    return jsonify(results)