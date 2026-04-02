from flask import Blueprint, request, jsonify
from app.db import execute_read_query, execute_write_query
from app.auth.middleware import token_required

admin_bp = Blueprint('admin', __name__)
# --- HELPER FUNCTION ---
def get_current_hall_id(staff_id):
    """Dynamically fetches the hall_id for the currently logged-in staff member."""
    sql = "SELECT hall_id FROM STAFFS WHERE staff_id = %s"
    result = execute_read_query(sql, (staff_id,))
    return result[0]['hall_id'] if result else None


@admin_bp.route('/dashboard', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_dashboard():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    sql = """
        SELECT
            s.staff_id,
            s.name       AS name,
            s.phone_number,
            u.email_address,
            h.name       AS hall_name,
            h.hall_id,
            (s.photo IS NOT NULL) AS has_photo
        FROM STAFFS s
        JOIN USERS u  ON s.user_id  = u.user_id
        JOIN HALLS h  ON s.hall_id  = h.hall_id
        WHERE s.staff_id = %s
    """
    result = execute_read_query(sql, (current_admin_id,))
    if not result:
        return jsonify({"error": "Staff not found"}), 404

    return jsonify(result[0]), 200







# --- 1) VIEW USERS (Students & Staff) ---
@admin_bp.route('/students', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_all_students():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)
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
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)
    sql = """
        SELECT s.*, h.name as hall_name, u.email_address 
        FROM STAFFS s
        JOIN HALLS h ON s.hall_id = h.hall_id
        JOIN USERS u ON s.user_id = u.user_id
    """
    return jsonify(execute_read_query(sql))



# --- 3) SEAT ALLOCATION (The Core Logic) ---

@admin_bp.route('/rooms', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_rooms_and_seats():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)
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
    results = execute_read_query(sql, (current_hall_id,))
    
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
#Need to filter halls
@admin_bp.route('/approved-students', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_approved_students_needing_seats():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)
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
    students = execute_read_query(sql, (current_hall_id,))
    return jsonify(students if students else []), 200

@admin_bp.route('/allocate', methods=['POST', 'OPTIONS'])
@token_required(allowed_roles=['admin'])
def allocate_seat():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)
    # Handle CORS Preflight
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    student_id = data.get('student_id')
    room_id = data.get('room_id')
    seat_number = data.get('seat_number')
    
    # 1. Create Allocation
    # The PostgreSQL Trigger will automatically update the STUDENTS and SEATS tables!
    execute_write_query("""
        INSERT INTO ALLOCATIONS (student_id, room_id, seat_number, start_date) 
        VALUES (%s, %s, %s, CURRENT_DATE)
    """, (student_id, room_id, seat_number))

    return jsonify({"message": "Student successfully allocated"}), 200

@admin_bp.route('/deallocate', methods=['POST', 'OPTIONS'])
@token_required(allowed_roles=['admin'])
def deallocate_seat():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)
    # Handle CORS Preflight
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    room_id = data.get('room_id')
    seat_number = data.get('seat_number')
    student_id = data.get('student_id')
    
    # 1. End the allocation
    # The PostgreSQL Trigger will automatically revert the STUDENTS and SEATS statuses!
    execute_write_query("""
        UPDATE ALLOCATIONS SET end_date = CURRENT_DATE 
        WHERE student_id = %s AND room_id = %s AND seat_number = %s AND end_date IS NULL
    """, (student_id, room_id, seat_number))
    
    return jsonify({"message": "Student successfully deallocated"}), 200



# --- 4) APPROVE DONATIONS ---
@admin_bp.route('/donations/pending', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_pending_donations():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)
    return jsonify(execute_read_query("SELECT * FROM DONATIONS WHERE status = 'Pending'"))

@admin_bp.route('/donations/<int:donation_id>/approve', methods=['PUT', 'OPTIONS'])
@token_required(allowed_roles=['admin'])
def approve_donation(donation_id):
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    # Handle CORS Preflight
    if request.method == 'OPTIONS':
        return '', 200

    sql = "UPDATE DONATIONS SET status = 'Approved' WHERE donation_id = %s"
    if execute_write_query(sql, (donation_id,)):
        return jsonify({"message": "Donation request approved and is now public"})
    return jsonify({"error": "Approval failed"}), 400



# --- 5) SEAT APPROVALS ---

@admin_bp.route('/seat-approvals', methods=['GET'])
@token_required(allowed_roles=['admin']) # Adjust to 'provost' if you have a separate role!
def get_all_seat_applications():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)
    sql = """
        SELECT 
            sa.application_id, 
            sa.student_id, 
            s.name, 
            s.phone_number,
            get_department_name(sa.student_id) AS department,
            CAST(SUBSTRING(sa.student_id FROM 1 FOR 2) AS INT) AS batch_year,
            sa.description, 
            sa.status, 
            sa.priority_value,
            sa.date
        FROM SEAT_APPLICATION sa
        JOIN STUDENTS s ON sa.student_id = s.student_id
        ORDER BY 
            CASE sa.status 
                WHEN 'Pending' THEN 1 
                WHEN 'Approved' THEN 2 
                WHEN 'Refused' THEN 3
            END,
            sa.priority_value DESC NULLS LAST,
            CAST(SUBSTRING(sa.student_id FROM 1 FOR 2) AS INT) ASC
    """

    return jsonify(execute_read_query(sql)), 200

@admin_bp.route('/seat-approvals/<int:app_id>/status', methods=['PUT', 'OPTIONS'])
@token_required(allowed_roles=['admin'])
def update_seat_approval_status(app_id):
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)
    # Handle CORS Preflight
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.get_json()
    new_status = data.get('status') 
    
    if new_status not in ['Approved', 'Refused']:
        return jsonify({"error": "Invalid status"}), 400

    sql = "UPDATE SEAT_APPLICATION SET status = %s WHERE application_id = %s"
    if execute_write_query(sql, (new_status, app_id)):
        return jsonify({"message": f"Application {new_status.lower()} successfully."}), 200
    return jsonify({"error": "Failed to update status."}), 500
