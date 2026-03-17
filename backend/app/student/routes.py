from flask import Blueprint, request, jsonify
from app.db import execute_read_query, execute_write_query
from datetime import datetime
import random

# 1. Define the Blueprint
student_bp = Blueprint('student', __name__)

# In a real app, this comes from the login session.
CURRENT_STUDENT_ID = '2305108'

# --- 1) STUDENT PROFILE ---
@student_bp.route('/profile', methods=['GET'])
def get_profile():
    # Join STUDENTS, USERS, and HALLS to get a complete picture
    sql = """
        SELECT s.student_id, s.name, s.phone_number, s.status, 
               h.name as hall_name, u.email_address 
        FROM STUDENTS s
        JOIN USERS u ON s.user_id = u.user_id
        JOIN HALLS h ON s.hall_id = h.hall_id
        WHERE s.student_id = %s
    """
    profile = execute_read_query(sql, (CURRENT_STUDENT_ID,))
    if profile:
        return jsonify(profile[0])
    return jsonify({"error": "Student not found"}), 404

# --- 2) PAYMENTS (Fees) ---
@student_bp.route('/payments', methods=['GET'])
def get_payments():
    # Shows all fees (Mess, Tuition, etc.) assigned to this student
    sql = """
        SELECT p.* FROM PAYMENTS p
        JOIN FEES f ON p.payment_id = f.payment_id
        WHERE f.student_id = %s
        ORDER BY p.due_time DESC
    """
    return jsonify(execute_read_query(sql, (CURRENT_STUDENT_ID,)))

@student_bp.route('/payments/<int:payment_id>/pay', methods=['POST'])
def pay_fee(payment_id):
    # Simulates paying a bill
    sql = "UPDATE PAYMENTS SET status = 'Paid', paid_at = CURRENT_TIMESTAMP WHERE payment_id = %s"
    success = execute_write_query(sql, (payment_id,))
    if success:
        return jsonify({"message": "Payment successful"})
    return jsonify({"error": "Payment failed"}), 400



# --- 3) DONATIONS ---

@student_bp.route('/donations', methods=['GET'])
def list_donations():
    # This query joins DONATIONS -> ASKS_FOR -> STUDENTS (and STAFFS)
    # COALESCE picks the first non-null value, perfectly handling the Student vs Staff logic
    sql = """
        SELECT 
            d.donation_id as id,
            d.description,
            TO_CHAR(d.end_date, 'YYYY-MM-DD') as "endDate",
            d.status,
            COALESCE(st.student_id, sf.staff_id) as "requesterId",
            COALESCE(st.name, sf.name) as "requesterName",
            CASE 
                WHEN st.student_id IS NOT NULL THEN 'Student'
                ELSE 'Staff'
            END as "requesterType",
            COALESCE(st.phone_number, sf.phone_number) as phone
        FROM DONATIONS d
        JOIN ASKS_FOR af ON d.donation_id = af.donation_id
        LEFT JOIN STUDENTS st ON af.student_id = st.student_id
        LEFT JOIN STAFFS sf ON af.staff_id = sf.staff_id
        WHERE d.end_date >= CURRENT_DATE
        ORDER BY d.start_date DESC
    """
    donations = execute_read_query(sql)
    return jsonify(donations)

@student_bp.route('/donations', methods=['POST'])
def create_donation():
    data = request.get_json()
    desc = data.get('description')
    end_date = data.get('endDate')
    
    # This single query inserts the donation AND links it to the student instantly
    sql = """
        WITH new_donation AS (
            INSERT INTO DONATIONS (description, end_date) 
            VALUES (%s, %s) 
            RETURNING donation_id
        )
        INSERT INTO ASKS_FOR (donation_id, student_id)
        SELECT donation_id, %s FROM new_donation;
    """
    
    success = execute_write_query(sql, (desc, end_date, CURRENT_STUDENT_ID))
    
    if success:
        return jsonify({"message": "Donation request submitted"}), 201
    return jsonify({"error": "Failed to create request"}), 500

@student_bp.route('/donations/<int:donation_id>', methods=['DELETE'])
def withdraw_donation(donation_id):
    # Ensure a student can only delete their OWN pending donation
    sql = """
        DELETE FROM DONATIONS 
        WHERE donation_id = %s 
        AND status = 'Pending'
        AND donation_id IN (
            SELECT donation_id FROM ASKS_FOR WHERE student_id = %s
        )
    """
    success = execute_write_query(sql, (donation_id, CURRENT_STUDENT_ID))
    if success:
        return jsonify({"message": "Donation request withdrawn"}), 200
    return jsonify({"error": "Cannot delete this donation"}), 403

@student_bp.route('/donations/<int:donation_id>/pledge', methods=['POST'])
def pledge_donation(donation_id):
    data = request.get_json()
    amount = data.get('pledgeAmount') # Matches frontend payload
    
    if not amount or float(amount) <= 0:
         return jsonify({"error": "Invalid amount"}), 400

    # Step 1: Create a Payment obligation (Status: Due)
    sql_pay = """
        INSERT INTO PAYMENTS (payment_type, amount, due_time, status) 
        VALUES ('Donation', %s, CURRENT_TIMESTAMP, 'Due') 
        RETURNING payment_id
    """
    res = execute_read_query(sql_pay, (amount,))
    
    if res:
        new_pay_id = res[0]['payment_id']
        
        # Step 2: Link Payment to the specific Donation (GENERATES)
        sql_gen = "INSERT INTO GENERATES (payment_id, donation_id) VALUES (%s, %s)"
        execute_write_query(sql_gen, (new_pay_id, donation_id))
        
        # Step 3: Link Payment to the Student who pledged (FEES)
        sql_fee = "INSERT INTO FEES (payment_id, student_id) VALUES (%s, %s)"
        execute_write_query(sql_fee, (new_pay_id, CURRENT_STUDENT_ID))
        
        return jsonify({"message": "Pledge recorded as a due payment."}), 201
        
    return jsonify({"error": "Pledge failed"}), 500



# --- 4) NOTICES ---
@student_bp.route('/notices', methods=['GET'])
def get_notices():
    sql = "SELECT title, description, created_at FROM NOTICE ORDER BY created_at DESC"
    return jsonify(execute_read_query(sql))



# --- 5) VISITORS ---
@student_bp.route('/visitors', methods=['GET'])
def get_visitors():
    sql = """
        SELECT visitor_id as id, name, phone_number as phone, relationship, 
               TO_CHAR(entry_time, 'YYYY-MM-DD HH12:MI AM') as entry_time,
               TO_CHAR(exit_time, 'YYYY-MM-DD HH12:MI AM') as exit_time,
               entry_time as raw_entry
        FROM VISITORS 
        WHERE student_id = %s AND hidden_by_student = FALSE
        ORDER BY raw_entry DESC
    """
    visitors = execute_read_query(sql, (CURRENT_STUDENT_ID,))
    return jsonify(visitors if visitors else []), 200

@student_bp.route('/visitors', methods=['POST'])
def add_visitor():
    data = request.get_json()
    
    required_fields = ['name', 'phone', 'relationship', 'entry_time', 'exit_time']
    for field in required_fields:
        if not data.get(field) or str(data.get(field)).strip() == "":
            return jsonify({"error": f"Field '{field}' is required"}), 400
    
    if data['entry_time'] >= data['exit_time']:
        return jsonify({"error": "Entry time must be before exit time"}), 400
    
    # 1. Generate the visitor_id (Format: YYYYMMDD-XXX)
    date_str = datetime.now().strftime('%Y%m%d')
    random_suffix = str(random.randint(100, 999))
    visitor_id = f"{date_str}-{random_suffix}"
    
    # 2. Clean up empty strings from the frontend 
    # (If the user leaves 'phone' or 'exit_time' blank, make sure Python sends NULL to the DB)
    phone = data.get('phone') if data.get('phone') else None
    exit_time = data.get('exit_time') if data.get('exit_time') else None
    entry_time = data.get('entry_time') if data.get('entry_time') else None
    
    # 3. Insert into the database
    sql = """
        INSERT INTO VISITORS (visitor_id, student_id, name, phone_number, relationship, entry_time, exit_time)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    
    success = execute_write_query(sql, (
        visitor_id, 
        CURRENT_STUDENT_ID, 
        data.get('name'), 
        phone, 
        data.get('relationship'), 
        entry_time, 
        exit_time
    ))
    
    if success:
        return jsonify({"message": "Visitor expected", "id": visitor_id}), 201
        
    return jsonify({"error": "Failed to add visitor"}), 400

@student_bp.route('/visitors/<visitor_id>/hide', methods=['PUT'])
def hide_visitor(visitor_id):
    # Soft delete a specific visitor
    sql = "UPDATE VISITORS SET hidden_by_student = TRUE WHERE visitor_id = %s AND student_id = %s"
    execute_write_query(sql, (visitor_id, CURRENT_STUDENT_ID))
    return jsonify({"message": "Visitor hidden from log"}), 200

@student_bp.route('/visitors/clear', methods=['PUT'])
def clear_visitors():
    # Soft delete ALL visitors for this student
    sql = "UPDATE VISITORS SET hidden_by_student = TRUE WHERE student_id = %s"
    execute_write_query(sql, (CURRENT_STUDENT_ID,))
    return jsonify({"message": "Visitor log cleared"}), 200



# --- 6) COMPLAINTS ---
@student_bp.route('/complaints', methods=['GET', 'POST'])
def manage_complaints():
    if request.method == 'GET':
        sql = "SELECT * FROM COMPLAINTS WHERE student_id = %s"
        return jsonify(execute_read_query(sql, (CURRENT_STUDENT_ID,)))

    if request.method == 'POST':
        data = request.get_json()
        c_type = data.get('complaint_type') # e.g., 'Food'
        desc = data.get('description')
        
        sql = "INSERT INTO COMPLAINTS (student_id, complaint_type, description) VALUES (%s, %s, %s)"
        execute_write_query(sql, (CURRENT_STUDENT_ID, c_type, desc))
        return jsonify({"message": "Complaint filed"}), 201

@student_bp.route('/complaints/<int:complaint_id>', methods=['DELETE'])
def remove_complaint(complaint_id):
    # We add student_id to WHERE so students can't delete others' complaints
    sql = "DELETE FROM COMPLAINTS WHERE complaint_id = %s AND student_id = %s"
    success = execute_write_query(sql, (complaint_id, CURRENT_STUDENT_ID))
    if success:
        return jsonify({"message": "Complaint removed"})
    return jsonify({"error": "Not found or unauthorized"}), 404




# --- 7) SEAT APPLICATION (Residency) ---
@student_bp.route('/apply-seat', methods=['POST'])
def apply_seat():
    data = request.get_json()
    desc = data.get('description')
    
    # Check if they already have a pending application
    check_sql = "SELECT * FROM SEAT_APPLICATION WHERE student_id = %s AND status = 'Pending'"
    if execute_read_query(check_sql, (CURRENT_STUDENT_ID,)):
        return jsonify({"error": "You already have a pending application"}), 400

    sql = "INSERT INTO SEAT_APPLICATION (student_id, description) VALUES (%s, %s)"
    success = execute_write_query(sql, (CURRENT_STUDENT_ID, desc))
    if success:
        return jsonify({"message": "Application submitted"}), 201
    return jsonify({"error": "Submission failed"}), 500