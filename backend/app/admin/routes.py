from flask import Blueprint, request, jsonify
from app.db import execute_read_query, execute_write_query

admin_bp = Blueprint('admin', __name__)

# --- 1) VIEW USERS (Students & Staff) ---
@admin_bp.route('/students', methods=['GET'])
def get_all_students():
    sql = """
        SELECT s.*, h.name as hall_name, u.email_address 
        FROM STUDENTS s
        JOIN HALLS h ON s.hall_id = h.hall_id
        JOIN USERS u ON s.user_id = u.user_id
    """
    return jsonify(execute_read_query(sql))

@admin_bp.route('/staff', methods=['GET'])
def get_all_staff():
    sql = """
        SELECT s.*, h.name as hall_name, u.email_address 
        FROM STAFFS s
        JOIN HALLS h ON s.hall_id = h.hall_id
        JOIN USERS u ON s.user_id = u.user_id
    """
    return jsonify(execute_read_query(sql))


# --- 2) MANAGE SEAT APPLICATIONS ---
@admin_bp.route('/seat-applications', methods=['GET'])
def view_applications():
    # Admin sees all pending applications, sorted by priority
    sql = "SELECT * FROM SEAT_APPLICATION WHERE status = 'Pending' ORDER BY priority_value DESC"
    return jsonify(execute_read_query(sql))

@admin_bp.route('/seat-applications/<int:app_id>', methods=['PUT'])
def process_application(app_id):
    data = request.get_json()
    new_status = data.get('status') # 'Approved' or 'Refused'
    
    sql = "UPDATE SEAT_APPLICATION SET status = %s WHERE application_id = %s"
    if execute_write_query(sql, (new_status, app_id)):
        return jsonify({"message": f"Application {new_status}"})
    return jsonify({"error": "Update failed"}), 400


# --- 3) SEAT ALLOCATION (The Core Logic) ---
@admin_bp.route('/allocate-seat', methods=['POST'])
def allocate_seat():
    data = request.get_json()
    student_id = data.get('student_id')
    room_id = data.get('room_id')      # Optional manual override
    seat_num = data.get('seat_number') # Optional manual override

    # If Admin didn't specify a seat, find the first 'Vacant' one automatically
    if not room_id or not seat_num:
        find_sql = "SELECT room_id, seat_number FROM SEATS WHERE status = 'Vacant' LIMIT 1"
        available_seat = execute_read_query(find_sql)
        if not available_seat:
            return jsonify({"error": "No vacant seats available"}), 404
        room_id = available_seat[0]['room_id']
        seat_num = available_seat[0]['seat_number']

    # Update 1: Create the Allocation record
    alloc_sql = """
        INSERT INTO ALLOCATIONS (student_id, room_id, seat_number, start_date)
        VALUES (%s, %s, %s, CURRENT_DATE)
    """
    # Update 2: Mark Seat as Occupied
    seat_sql = "UPDATE SEATS SET status = 'Occupied' WHERE room_id = %s AND seat_number = %s"
    
    # Update 3: Change Student Status to RESIDENT
    student_sql = "UPDATE STUDENTS SET status = 'RESIDENT' WHERE student_id = %s"

    # In a real app, wrap these in a transaction. For now:
    execute_write_query(alloc_sql, (student_id, room_id, seat_num))
    execute_write_query(seat_sql, (room_id, seat_num))
    execute_write_query(student_sql, (student_id,))

    return jsonify({
        "message": "Seat allocated successfully",
        "room": room_id,
        "seat": seat_num
    })


# --- 4) APPROVE DONATIONS ---
@admin_bp.route('/donations/pending', methods=['GET'])
def get_pending_donations():
    return jsonify(execute_read_query("SELECT * FROM DONATIONS WHERE status = 'Pending'"))

@admin_bp.route('/donations/<int:donation_id>/approve', methods=['PUT'])
def approve_donation(donation_id):
    sql = "UPDATE DONATIONS SET status = 'Approved' WHERE donation_id = %s"
    if execute_write_query(sql, (donation_id,)):
        return jsonify({"message": "Donation request approved and is now public"})
    return jsonify({"error": "Approval failed"}), 400