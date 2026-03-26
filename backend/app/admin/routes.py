from flask import Blueprint, request, jsonify
from app.db import execute_read_query, execute_write_query
from app.auth.middleware import token_required

admin_bp = Blueprint('admin', __name__)

CURRENT_HALL_ID = 1

# --- 1) VIEW USERS (Students & Staff) ---
@admin_bp.route('/students', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_all_students():
    sql = """
        SELECT s.*, h.name as hall_name, u.email_address 
        FROM STUDENTS s
        JOIN HALLS h ON s.hall_id = h.hall_id
        JOIN USERS u ON s.user_id = u.user_id
    """
    return jsonify(execute_read_query(sql))

@admin_bp.route('/staff', methods=['GET'])
@token_required(allowed_roles=['admin'])
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
@token_required(allowed_roles=['admin'])
def view_applications():
    sql = "SELECT * FROM SEAT_APPLICATION WHERE status = 'Pending' ORDER BY priority_value DESC"
    return jsonify(execute_read_query(sql))

@admin_bp.route('/seat-applications/<int:app_id>', methods=['PUT', 'OPTIONS'])
@token_required(allowed_roles=['admin'])
def process_application(app_id):
    # Handle CORS Preflight
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    new_status = data.get('status') 
    
    sql = "UPDATE SEAT_APPLICATION SET status = %s WHERE application_id = %s"
    if execute_write_query(sql, (new_status, app_id)):
        return jsonify({"message": f"Application {new_status}"})
    return jsonify({"error": "Update failed"}), 400



# --- 3) SEAT ALLOCATION (The Core Logic) ---

@admin_bp.route('/rooms', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_rooms_and_seats():
    sql = """
        SELECT r.room_id, r.capacity, s.seat_number, a.student_id
        FROM ROOMS r
        JOIN SEATS s ON r.room_id = s.room_id
        LEFT JOIN ALLOCATIONS a ON s.room_id = a.room_id 
                               AND s.seat_number = a.seat_number 
                               AND a.end_date IS NULL
        WHERE r.hall_id = %s
        ORDER BY r.room_id, s.seat_number
    """
    results = execute_read_query(sql, (CURRENT_HALL_ID,))
    
    rooms_dict = {}
    for row in results:
        rid = row['room_id']
        if rid not in rooms_dict:
            rooms_dict[rid] = {
                "id": rid,
                "floor": int(rid) // 100,
                "capacity": row['capacity'],
                "seats": []
            }
        rooms_dict[rid]['seats'].append({
            "seat_number": row['seat_number'],
            "studentId": row['student_id']
        })
        
    return jsonify(list(rooms_dict.values())), 200

@admin_bp.route('/approved-students', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_approved_students_needing_seats():
    sql = """
        SELECT s.student_id, s.name, sa.priority_value
        FROM STUDENTS s
        JOIN SEAT_APPLICATION sa ON s.student_id = sa.student_id
        LEFT JOIN ALLOCATIONS a ON s.student_id = a.student_id AND a.end_date IS NULL
        WHERE s.hall_id = %s 
          AND sa.status = 'Approved' 
          AND a.room_id IS NULL
        ORDER BY sa.priority_value DESC
    """
    students = execute_read_query(sql, (CURRENT_HALL_ID,))
    return jsonify(students if students else []), 200

@admin_bp.route('/allocate', methods=['POST', 'OPTIONS'])
@token_required(allowed_roles=['admin'])
def allocate_seat():
    # Handle CORS Preflight
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    student_id = data.get('student_id')
    room_id = data.get('room_id')
    seat_number = data.get('seat_number')
    
    # 1. Create Allocation
    execute_write_query("""
        INSERT INTO ALLOCATIONS (student_id, room_id, seat_number, start_date) 
        VALUES (%s, %s, %s, CURRENT_DATE)
    """, (student_id, room_id, seat_number))
    
    # 2. Update Student Status and Seat Status
    execute_write_query("UPDATE STUDENTS SET status = 'RESIDENT' WHERE student_id = %s", (student_id,))
    execute_write_query("UPDATE SEATS SET status = 'occupied' WHERE room_id = %s AND seat_number = %s", (room_id, seat_number))

    return jsonify({"message": "Student successfully allocated"}), 200

@admin_bp.route('/deallocate', methods=['POST', 'OPTIONS'])
@token_required(allowed_roles=['admin'])
def deallocate_seat():
    # Handle CORS Preflight
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    room_id = data.get('room_id')
    seat_number = data.get('seat_number')
    student_id = data.get('student_id')
    
    # 1. End the allocation
    execute_write_query("""
        UPDATE ALLOCATIONS SET end_date = CURRENT_DATE 
        WHERE student_id = %s AND room_id = %s AND seat_number = %s AND end_date IS NULL
    """, (student_id, room_id, seat_number))
    
    # 2. Revert Statuses
    execute_write_query("UPDATE STUDENTS SET status = 'ATTACHED' WHERE student_id = %s", (student_id,))
    execute_write_query("UPDATE SEATS SET status = 'vacant' WHERE room_id = %s AND seat_number = %s", (room_id, seat_number))
    
    return jsonify({"message": "Student successfully deallocated"}), 200



# --- 4) APPROVE DONATIONS ---
@admin_bp.route('/donations/pending', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_pending_donations():
    return jsonify(execute_read_query("SELECT * FROM DONATIONS WHERE status = 'Pending'"))

@admin_bp.route('/donations/<int:donation_id>/approve', methods=['PUT', 'OPTIONS'])
@token_required(allowed_roles=['admin'])
def approve_donation(donation_id):
    # Handle CORS Preflight
    if request.method == 'OPTIONS':
        return '', 200

    sql = "UPDATE DONATIONS SET status = 'Approved' WHERE donation_id = %s"
    if execute_write_query(sql, (donation_id,)):
        return jsonify({"message": "Donation request approved and is now public"})
    return jsonify({"error": "Approval failed"}), 400