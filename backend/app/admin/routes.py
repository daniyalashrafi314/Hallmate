from flask import Blueprint, request, jsonify, Response
from datetime import datetime, date
from app.db import execute_read_query, execute_write_query
from app.auth.middleware import token_required
from app.email_service import send_welcome_email, send_student_deletion_email, send_staff_deletion_email
from app.security.passwords import hash_password
import re
import secrets
import string

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


# --- 1) ADMIN PROFILE PAGE ---

@admin_bp.route('/profile', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_profile():
    current_admin_id = request.current_user_id

    # CHANGED: Added LEFT JOIN STAFFS pr to dynamically fetch the provost's name
    sql = """
        SELECT
        s.staff_id,
        s.name AS staff_name,
        s.phone_number,
        s.role,
        s.hall_id,
        h.name AS hall_name,
        pr.name AS provost,
        u.email_address,
        (s.photo IS NOT NULL) AS has_photo
        FROM STAFFS s
        JOIN USERS u ON s.user_id = u.user_id
        JOIN HALLS h ON s.hall_id = h.hall_id
        LEFT JOIN STAFFS pr ON h.provost_id = pr.staff_id
        WHERE s.staff_id = %s
    """
    profile = execute_read_query(sql, (current_admin_id,))

    if profile:
        return jsonify(profile[0])
    return jsonify({"error": "Staff not found"}), 404


@admin_bp.route('/profile/photo', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_profile_photo():
    current_admin_id = request.current_user_id

    sql = """
        SELECT photo
        FROM STAFFS
        WHERE staff_id = %s
        """
    result = execute_read_query(sql, (current_admin_id,))
    if not result or not result[0].get('photo'):
        return jsonify({"error": "No photo found"}), 404
    return Response(
        result[0]['photo'],
        mimetype='image/jpeg',
        headers={"Content-Disposition": "inline; filename=profile_photo.jpg"}
    )


@admin_bp.route('/profile', methods=['PUT'])
@token_required(allowed_roles=['admin'])
def edit_profile():
    current_admin_id = request.current_user_id

    if request.content_type and request.content_type.startswith('multipart/form-data'):
        name = request.form.get("staff_name")
        phone = request.form.get("phone_number")
        email = request.form.get("email_address")
        photo_file = request.files.get("photo")
    else:
        data = request.get_json() or {}
        name = data.get("staff_name")
        phone = data.get("phone_number")
        email = data.get("email_address")
        photo_file = None

    if not name or not email:
        return jsonify({"error": "Missing fields"}), 400

    staff_update_fields = ["name = %s", "phone_number = %s"]
    staff_update_values = [name, phone]

    if photo_file:
        photo_bytes = photo_file.read()
        staff_update_fields.append("photo = %s")
        staff_update_values.append(photo_bytes)

    staff_update_values.append(current_admin_id)

    # 1. Update the Staff Member's Details
    sql1 = f"""
            UPDATE STAFFS
            SET {', '.join(staff_update_fields)}
            WHERE staff_id = %s
            """
    execute_write_query(sql1, tuple(staff_update_values))

    # 2. Update the User's Login Email
    sql2 = """
        UPDATE USERS
        SET email_address = %s
        WHERE user_id = (
            SELECT user_id
            FROM STAFFS
            WHERE staff_id = %s
        )"""
    execute_write_query(sql2, (email, current_admin_id))

    # CHANGED: We completely removed sql3 and sql4. The Provost name is now 
    # intrinsically linked via foreign key, so updating STAFFS is all that's required.

    return jsonify({"message": "Profile updated successfully"}), 200


@admin_bp.route('/change-password', methods=['PUT'])
@token_required(allowed_roles=['admin'])
def change_password():
    current_admin_id = request.current_user_id
    data = request.get_json()

    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")
    if not new_password:
        return jsonify({"error": "Password required"}), 400

    if new_password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400

    hashed_password = hash_password(new_password)

    sql = """
        UPDATE USERS
        SET password = %s
        WHERE user_id = (
            SELECT user_id
            FROM STAFFS
            WHERE staff_id = %s
            )
        """
    execute_write_query(sql, (hashed_password, current_admin_id))
    return jsonify({"message": "Password changed successfully"})











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

    # Tasks page

    # --- ADMIN TASK MANAGEMENT ---

@admin_bp.route('/tasks', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_hall_tasks():
    current_admin_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_admin_id)
    
    # Pagination
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    offset = (page - 1) * limit
    
    # Filters & Search
    status_filter = request.args.get('status', 'all')
    search_query = request.args.get('search', '').strip()
    
    valid_statuses = ['pending', 'in_progress', 'completed', 'cancelled', 'submitted']
    if status_filter != 'all' and status_filter not in valid_statuses:
        return jsonify({"error": "Invalid status filter"}), 400

    # Base query: Join tasks with assignments and staff to ensure it's in the admin's hall
    base_sql = """
        FROM TASKS t
        JOIN task_assignments ta ON t.task_id = ta.task_id
        JOIN STAFFS s ON ta.staff_id = s.staff_id
        WHERE s.hall_id = %s
    """
    params = [current_hall_id]

    # Dynamically build WHERE clauses based on filters
    if status_filter != 'all':
        base_sql += " AND t.status = %s"
        params.append(status_filter)
        
    if search_query:
        base_sql += " AND (ta.staff_id ILIKE %s OR t.title ILIKE %s)"
        params.extend([f"%{search_query}%", f"%{search_query}%"])

    # Fetch paginated tasks
    select_sql = """
        SELECT 
            t.task_id, 
            t.title, 
            t.priority, 
            t.status, 
            t.due_date, 
            t.created_at,
            ta.staff_id,
            s.name AS staff_name
    """ + base_sql + """
        ORDER BY 
            CASE t.priority 
                WHEN 'high' THEN 1 
                WHEN 'medium' THEN 2 
                WHEN 'low' THEN 3 
            END ASC,
            t.created_at DESC
        LIMIT %s OFFSET %s
    """
    select_params = params + [limit, offset]
    tasks = execute_read_query(select_sql, tuple(select_params))

    # Fetch total count for frontend pagination
    count_sql = "SELECT COUNT(*) as total " + base_sql
    total_result = execute_read_query(count_sql, tuple(params))
    total_count = total_result[0]['total'] if total_result else 0

    return jsonify({
        "tasks": tasks if tasks else [],
        "pagination": {
            "page": page,
            "limit": limit,
            "total_tasks": total_count,
            "total_pages": (total_count + limit - 1) // limit
        }
    }), 200


@admin_bp.route('/tasks/<int:task_id>', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_admin_task_details(task_id):
    current_admin_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_admin_id)
    
    sql = """
        SELECT 
            t.*, 
            ta.assignment_id,
            ta.assigned_at, 
            ta.seen_at,
            ta.staff_id,
            s.name AS staff_name,
            s.role AS staff_role
        FROM TASKS t
        JOIN task_assignments ta ON t.task_id = ta.task_id
        JOIN STAFFS s ON ta.staff_id = s.staff_id
        WHERE t.task_id = %s AND s.hall_id = %s
    """
    result = execute_read_query(sql, (task_id, current_hall_id))
    
    if not result:
        return jsonify({"error": "Task not found in your hall"}), 404
        
    return jsonify(result[0]), 200


@admin_bp.route('/tasks', methods=['POST', 'OPTIONS'])
@token_required(allowed_roles=['admin'])
def create_task():
    # Handle CORS Preflight
    if request.method == 'OPTIONS':
        return '', 200

    current_admin_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_admin_id)
    data = request.get_json()

    # Extract required fields
    title = data.get('title')
    description = data.get('description', '')
    priority = data.get('priority', 'medium')
    due_date = data.get('due_date')
    assigned_staff_id = data.get('assigned_staff_id')

    if not title or not assigned_staff_id:
        return jsonify({"error": "Title and assigned_staff_id are required"}), 400

    valid_priorities = ['low', 'medium', 'high']
    if priority not in valid_priorities:
        return jsonify({"error": "Invalid priority"}), 400

    # Enforce due_date validity: format must be YYYY-MM-DD and cannot be in the past.
    if due_date:
        try:
            parsed_due_date = datetime.strptime(str(due_date), '%Y-%m-%d').date()
        except ValueError:
            return jsonify({"error": "Invalid due_date format. Expected YYYY-MM-DD."}), 400

        if parsed_due_date < date.today():
            return jsonify({"error": "Due date cannot be earlier than today."}), 400

    # 1. Verify the target staff member actually belongs to this admin's hall
    verify_staff_sql = "SELECT 1 FROM STAFFS WHERE staff_id = %s AND hall_id = %s"
    if not execute_read_query(verify_staff_sql, (assigned_staff_id, current_hall_id)):
        return jsonify({"error": "Staff member not found or does not belong to your hall"}), 403

    # 2. Insert the Task AND the Task Assignment in one go using a CTE
    insert_sql = """
        WITH new_task AS (
            INSERT INTO TASKS (provost_id, title, description, priority, due_date)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING task_id
        )
        INSERT INTO task_assignments (task_id, staff_id)
        SELECT task_id, %s FROM new_task;
    """
    
    params = (current_admin_id, title, description, priority, due_date, assigned_staff_id)
    
    if execute_write_query(insert_sql, params):
        return jsonify({"message": "Task successfully created and assigned"}), 201
    
    return jsonify({"error": "Failed to create task"}), 500


@admin_bp.route('/tasks/<int:task_id>/status', methods=['PUT', 'OPTIONS'])
@token_required(allowed_roles=['admin'])
def admin_update_task_status(task_id):
    # Handle CORS Preflight
    if request.method == 'OPTIONS':
        return '', 200

    current_admin_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_admin_id)
    data = request.get_json()
    new_status = data.get('status')

    valid_statuses = ['pending', 'in_progress', 'completed', 'cancelled', 'submitted']
    if new_status not in valid_statuses:
        return jsonify({"error": "Invalid status"}), 400

    # Verify task belongs to this admin's hall before updating
    verify_sql = """
        SELECT 1 FROM TASKS t
        JOIN task_assignments ta ON t.task_id = ta.task_id
        JOIN STAFFS s ON ta.staff_id = s.staff_id
        WHERE t.task_id = %s AND s.hall_id = %s
    """
    if not execute_read_query(verify_sql, (task_id, current_hall_id)):
        return jsonify({"error": "Task not found in your hall"}), 404

    update_sql = "UPDATE TASKS SET status = %s, updated_at = CURRENT_TIMESTAMP WHERE task_id = %s"
    if execute_write_query(update_sql, (new_status, task_id)):
        return jsonify({"message": f"Task successfully marked as {new_status}"}), 200
        
    return jsonify({"error": "Failed to update task status"}), 500


@admin_bp.route('/tasks/<int:task_id>', methods=['DELETE', 'OPTIONS'])
@token_required(allowed_roles=['admin'])
def admin_delete_task(task_id):
    # Handle CORS Preflight
    if request.method == 'OPTIONS':
        return '', 200

    current_admin_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_admin_id)

    # Verify task belongs to this admin's hall before deleting
    verify_sql = """
        SELECT 1
        FROM TASKS t
        JOIN task_assignments ta ON t.task_id = ta.task_id
        JOIN STAFFS s ON ta.staff_id = s.staff_id
        WHERE t.task_id = %s AND s.hall_id = %s
    """
    if not execute_read_query(verify_sql, (task_id, current_hall_id)):
        return jsonify({"error": "Task not found in your hall"}), 404

    delete_sql = "DELETE FROM TASKS WHERE task_id = %s"
    if execute_write_query(delete_sql, (task_id,)):
        return jsonify({"message": "Task deleted successfully", "task_id": task_id}), 200

    return jsonify({"error": "Failed to delete task"}), 500

@admin_bp.route('/task-staff', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_staff_for_assignment():
    """
    Returns a list of staff members in the same hall as the Provost.
    Used to populate the staff selection dropdown in the 'New Task' modal.
    """
    current_admin_id = request.current_user_id
    
    # --- HELPER FUNCTION USED HERE ---
    # Fetches the hall_id of the currently logged-in Provost/Admin
    current_hall_id = get_current_hall_id(current_admin_id)
    
    if not current_hall_id:
        return jsonify({"error": "Hall not found for current user"}), 404

    # Fetch staff members belonging to this specific hall
    # We exclude the Provost themselves if you don't want them assigning tasks to themselves
    sql = """
        SELECT staff_id, name, role 
        FROM STAFFS 
        WHERE hall_id = %s AND staff_id != %s
        ORDER BY name ASC
    """
    staff_list = execute_read_query(sql, (current_hall_id, current_admin_id))
    
    return jsonify(staff_list if staff_list else []), 200

# --- STAFF MANAGEMENT ---

@admin_bp.route('/staffs', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_hall_staffs():
    """
    Returns a paginated list of staff in the provost's hall.
    Query params:
      - page    (int, default 1)
      - limit   (int, default 10)
      - search  (str, searches staff_id and name via ILIKE)
    """
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    try:
        page  = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 10))
    except ValueError:
        return jsonify({"error": "Invalid pagination params"}), 400

    if page < 1:
        return jsonify({"error": "page must be >= 1"}), 400

    limit = max(1, min(limit, 50))
    offset       = (page - 1) * limit
    search_query = request.args.get('search', '').strip()

    base_sql = """
        FROM STAFFS s
        JOIN USERS u ON s.user_id = u.user_id
        WHERE s.hall_id = %s
          AND s.staff_id != %s
    """
    params = [current_hall_id, current_admin_id]

    if search_query:
        base_sql += " AND (s.staff_id ILIKE %s OR s.name ILIKE %s)"
        params.extend([f"%{search_query}%", f"%{search_query}%"])

    select_sql = """
        SELECT
            s.staff_id,
            s.name,
            s.role,
            s.phone_number,
            u.email_address,
            (s.photo IS NOT NULL) AS has_photo
    """ + base_sql + """
        ORDER BY s.name ASC
        LIMIT %s OFFSET %s
    """
    select_params = params + [limit, offset]
    staffs = execute_read_query(select_sql, tuple(select_params))

    count_sql = "SELECT COUNT(*) AS total " + base_sql
    total_result = execute_read_query(count_sql, tuple(params))
    total_count  = total_result[0]['total'] if total_result else 0

    return jsonify({
        "staffs": staffs if staffs else [],
        "pagination": {
            "page":        page,
            "limit":       limit,
            "total_staffs": total_count,
            "total_pages": (total_count + limit - 1) // limit
        }
    }), 200


@admin_bp.route('/staffs/<string:staff_id>', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_staff_detail(staff_id):
    """
    Returns full details of a single staff member.
    Scoped to the provost's hall so a provost can't peek at other halls.
    """
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    sql = """
        SELECT
            s.staff_id,
            s.name,
            s.role,
            s.phone_number,
            s.salary,
            u.email_address,
            h.name       AS hall_name,
            (s.photo IS NOT NULL) AS has_photo
        FROM STAFFS s
        JOIN USERS u ON s.user_id  = u.user_id
        JOIN HALLS h ON s.hall_id  = h.hall_id
        WHERE s.staff_id = %s
          AND s.hall_id  = %s
    """
    result = execute_read_query(sql, (staff_id, current_hall_id))

    if not result:
        return jsonify({"error": "Staff member not found in your hall"}), 404

    return jsonify(result[0]), 200

@admin_bp.route('/staffs/<string:staff_id>/photo', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_staff_photo(staff_id):
    
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)
    sql = """
        SELECT photo
        FROM STAFFS
        WHERE staff_id = %s AND hall_id = %s
        """
    result = execute_read_query(sql, (staff_id, current_hall_id))
    if not result or not result[0].get('photo'):
        return jsonify({"error": "No photo found"}), 404
    return Response(
        result[0]['photo'],
        mimetype='image/jpeg', 
        headers={"Content-Disposition": "inline; filename=profile_photo.jpg"}
    )

@admin_bp.route('/staffs/<string:staff_id>', methods=['DELETE', 'OPTIONS'])
@token_required(allowed_roles=['admin'])
def delete_staff(staff_id):
    if request.method == 'OPTIONS':
        return '', 200

    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    # 1. Verify the staff exists in THIS provost's hall and grab data needed for deletion email
    verify_sql = """
        SELECT s.user_id, s.name AS staff_name, u.email_address, h.name AS hall_name
        FROM STAFFS s
        JOIN USERS u ON s.user_id = u.user_id
        JOIN HALLS h ON s.hall_id = h.hall_id
        WHERE s.staff_id = %s
          AND s.hall_id = %s
    """
    result = execute_read_query(verify_sql, (staff_id, current_hall_id))
    if not result:
        return jsonify({"error": "Staff member not found in your hall"}), 404

    user_id = result[0]['user_id']
    staff_name = result[0].get('staff_name')
    staff_email = result[0].get('email_address')
    hall_name = result[0].get('hall_name')

    # 2. Deleting the USERS row is all that's needed now.
    #    STAFFS cascades from USERS, which then cascades further:
    #      USERS → STAFFS → TASKS, task_assignments, SALARY, ASKS_FOR, PAYMENT_DELETE_REQUESTS
    #      STAFFS → NOTICE (staff_id SET NULL, notices are preserved)
    execute_write_query(
        "DELETE FROM USERS WHERE user_id = %s",
        (user_id,)
    )

    email_sent = False
    if staff_email:
        email_sent = send_staff_deletion_email(staff_email, staff_id, staff_name, hall_name)

    message = f"Staff {staff_id} and all associated records deleted successfully"
    if not email_sent:
        message += ". Warning: deletion email could not be sent."

    return jsonify({
        "message": message,
        "staff_id": staff_id,
        "email_sent": email_sent
    }), 200

@admin_bp.route('/staffs', methods=['POST'])
@token_required(allowed_roles=['admin'])
def add_staff():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    data         = request.get_json() or {}
    staff_id     = data.get('staff_id')
    email        = data.get('email_address')
    name         = data.get('name')
    phone_number = data.get('phone_number')

    if not staff_id or not email or not name or not phone_number:
        return jsonify({"error": "Missing required fields: staff_id, email_address, name, phone_number"}), 400

    if not re.fullmatch(r'^[A-Za-z0-9]{10}$', str(staff_id)):
        return jsonify({"error": "staff_id must be exactly 10 alphanumeric characters"}), 400

    alphabet     = string.ascii_letters + string.digits + "!@#$%^&*"
    raw_password = ''.join(secrets.choice(alphabet) for _ in range(10))
    hashed_pw    = hash_password(raw_password)

    try:
        execute_write_query(
            "INSERT INTO USERS (user_id, email_address, password) VALUES (%s, %s, %s)",
            (staff_id, email, hashed_pw)
        )
        execute_write_query(
            """
            INSERT INTO STAFFS (staff_id, hall_id, user_id, name, phone_number, role)
            VALUES (%s, %s, %s, %s, %s, 'Staff')
            """,
            (staff_id, current_hall_id, staff_id, name, phone_number)
        )
    except Exception:
        return jsonify({"error": "Staff member may already exist."}), 409

    email_sent = send_welcome_email(email, staff_id, raw_password)

    message = "Staff added successfully."
    if not email_sent:
        message += " Warning: Welcome email failed to send. Please distribute credentials manually."

    return jsonify({
        "message":   message,
        "staff_id":  staff_id,
        "email_sent": email_sent
    }), 201
# --- 8) STUDENT LIST & SEARCH ---

# --- STUDENT LIST (sub-page on add-students) ---

@admin_bp.route('/add-students/student-list', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_student_list():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    try:
        limit  = min(int(request.args.get('limit', 10)), 50)
        offset = int(request.args.get('offset', 0))
    except ValueError:
        return jsonify({"error": "Invalid pagination params"}), 400

    search        = request.args.get('search', None)
    status_filter = request.args.get('status', None)   # 'ATTACHED' | 'RESIDENT'
    batch_filter  = request.args.get('batch',  None)   # e.g. '23'
    room_filter   = request.args.get('room',   None)   # e.g. '101'

    VALID_STATUSES = {'ATTACHED', 'RESIDENT'}
    if status_filter and status_filter not in VALID_STATUSES:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(VALID_STATUSES)}"}), 400

    base = """
        FROM STUDENTS s
        LEFT JOIN ALLOCATIONS a ON s.student_id = a.student_id AND a.end_date IS NULL
        WHERE s.hall_id = %s
    """
    params = [current_hall_id]

    if status_filter:
        base += " AND s.status = %s"
        params.append(status_filter)
    if batch_filter:
        base += " AND SUBSTR(s.student_id, 1, 2) = %s"
        params.append(batch_filter)
    if room_filter:
        base += " AND a.room_id = %s"
        params.append(room_filter)
    if search:
        base += " AND (s.name ILIKE %s OR s.student_id LIKE %s)"
        params += [f"%{search}%", f"%{search}%"]

    count_params = list(params)

    sql = f"""
        SELECT
            s.student_id,
            s.name,
            s.status,
            a.room_id,
            (s.photo IS NOT NULL) AS has_photo
        {base}
        ORDER BY s.student_id ASC
        LIMIT %s OFFSET %s
    """
    params += [limit, offset]
    students = execute_read_query(sql, tuple(params))

    count_sql = f"SELECT COUNT(*) AS total {base}"
    total_row = execute_read_query(count_sql, tuple(count_params))
    total     = total_row[0]['total'] if total_row else 0

    return jsonify({
        "data": students,
        "pagination": {"limit": limit, "offset": offset, "total": total}
    }), 200


@admin_bp.route('/add-students/student-list/<string:student_id>', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_student_detail(student_id):
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    sql = """
        SELECT
            s.student_id,
            s.name,
            s.phone_number,
            s.status,
            u.email_address,
            h.name              AS hall_name,
            h.hall_id,
            a.room_id,
            a.seat_number,
            a.start_date        AS allocation_start_date,
            (s.photo IS NOT NULL) AS has_photo,
            get_department_name(s.student_id) AS department,
            get_batch_year(s.student_id)      AS batch_year
        FROM STUDENTS s
        JOIN USERS    u  ON s.user_id   = u.user_id
        JOIN HALLS    h  ON s.hall_id   = h.hall_id
        LEFT JOIN ALLOCATIONS a
               ON s.student_id = a.student_id AND a.end_date IS NULL
        WHERE s.student_id = %s
          AND s.hall_id    = %s
    """
    result = execute_read_query(sql, (student_id, current_hall_id))

    if not result:
        return jsonify({"error": "Student not found or unauthorized"}), 404

    return jsonify(result[0]), 200


@admin_bp.route('/add-students/student-list/<string:student_id>/photo', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_student_photo(student_id):
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    sql = """
        SELECT s.photo
        FROM STUDENTS s
        WHERE s.student_id = %s
          AND s.hall_id    = %s
    """
    result = execute_read_query(sql, (student_id, current_hall_id))

    if not result or not result[0].get('photo'):
        return jsonify({"error": "No photo found"}), 404

    return Response(
        result[0]['photo'],
        mimetype='image/jpeg',
        headers={"Content-Disposition": f"inline; filename={student_id}_photo.jpg"}
    )


@admin_bp.route('/add-students/student-list/<string:student_id>', methods=['DELETE'])
@token_required(allowed_roles=['admin'])
def delete_student(student_id):
    current_admin_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_admin_id)

    verify_sql = """
        SELECT s.user_id, s.name AS student_name, u.email_address, h.name AS hall_name
        FROM STUDENTS s
        JOIN USERS u ON s.user_id = u.user_id
        JOIN HALLS h ON s.hall_id = h.hall_id
        WHERE s.student_id = %s
          AND s.hall_id = %s
    """
    result = execute_read_query(verify_sql, (student_id, current_hall_id))
    if not result:
        return jsonify({"error": "Student not found in your hall"}), 404

    user_id = result[0]['user_id']
    student_name = result[0].get('student_name')
    student_email = result[0].get('email_address')
    hall_name = result[0].get('hall_name')

    delete_sql = """
        WITH removed_payments AS (
            DELETE FROM PAYMENTS p
            USING FEES f
            WHERE p.payment_id = f.payment_id
              AND f.student_id = %s
        ),
        deleted_user AS (
            DELETE FROM USERS
            WHERE user_id = %s
            RETURNING user_id
        )
        SELECT user_id FROM deleted_user;
    """
    deleted_user = execute_write_query(delete_sql, (student_id, user_id), return_result=True)

    if not deleted_user:
        return jsonify({"error": "Failed to delete student"}), 500

    email_sent = False
    if student_email:
        email_sent = send_student_deletion_email(student_email, student_id, student_name, hall_name)

    message = "Student deleted successfully"
    if not email_sent:
        message += ". Warning: deletion email could not be sent."

    return jsonify({
        "message": message,
        "student_id": student_id,
        "email_sent": email_sent
    }), 200



@admin_bp.route('/add-students', methods=['POST'])
@token_required(allowed_roles=['admin'])
def add_student():
    current_admin_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_admin_id)
    
    data = request.get_json()
    student_id = data.get('student_id')
    email_address = data.get('email_address')

    if not student_id or not email_address:
        return jsonify({"error": "Missing student_id or email_address"}), 400

    if not re.fullmatch(r'^\d{7}$', str(student_id)):
        return jsonify({"error": "Student ID must be exactly 7 digits."}), 400

    # generate password
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    raw_password = ''.join(secrets.choice(alphabet) for _ in range(10))
    hashed_password = hash_password(raw_password)

    try:
        proc_sql = """
            CALL register_new_student(%s, %s, %s, %s)
        """
        success = execute_write_query(
            proc_sql,
            (student_id, email_address.replace('@buet.ac.bd', ''), hashed_password, current_hall_id)
        )


        if not success:
            return jsonify({"error": "Failed to add student."}), 500

    except Exception:
        return jsonify({"error": "Student may already exist."}), 409

    email_sent = send_welcome_email(email_address, student_id, raw_password)

    message = "Student added successfully."
    if not email_sent:
        message += " Warning: Automated email failed to send. Please distribute credentials manually."

    return jsonify({
        "message": message,
        "student_id": student_id,
        "user_id": student_id
    }), 201

# --- 9) EVENTS ---

@admin_bp.route('/events', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_events():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    sql = """
        SELECT
            e.event_id   AS id,
            e.name,
            e.description,
            TO_CHAR(e.date, 'YYYY-MM-DD') AS date,
            e.video_link,
            e.is_public,
            e.hall_id,
            (e.hall_id = %s) AS is_own_hall
        FROM EVENTS e
        WHERE e.hall_id = %s OR e.is_public = TRUE
        ORDER BY e.date DESC
    """
    events = execute_read_query(sql, (current_hall_id, current_hall_id))
    return jsonify(events if events else []), 200


@admin_bp.route('/events', methods=['POST'])
@token_required(allowed_roles=['admin'])
def create_event():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    data        = request.get_json() or {}
    name        = data.get('name', '').strip()
    description = data.get('description', '').strip()
    date        = data.get('date')
    video_link  = data.get('video_link', '').strip() or None
    is_public   = bool(data.get('is_public', False))

    if not name:
        return jsonify({"error": "Event name is required"}), 400
    if not date:
        return jsonify({"error": "Event date is required"}), 400

    try:
        datetime.strptime(date, '%Y-%m-%d')
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    sql = """
        INSERT INTO EVENTS (name, description, date, hall_id, video_link, is_public)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING event_id
    """
    result = execute_write_query(
        sql,
        (name, description, date, current_hall_id, video_link, is_public),
        return_result=True
    )

    if not result:
        return jsonify({"error": "Failed to create event"}), 500

    return jsonify({
        "message": "Event created successfully",
        "event_id": result[0]['event_id']
    }), 201


@admin_bp.route('/events/<int:event_id>', methods=['PUT'])
@token_required(allowed_roles=['admin'])
def update_event(event_id):
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    # Ownership check — admin can only edit events belonging to their own hall
    owner_check = execute_read_query(
        "SELECT event_id FROM EVENTS WHERE event_id = %s AND hall_id = %s",
        (event_id, current_hall_id)
    )
    if not owner_check:
        return jsonify({"error": "Event not found or unauthorized"}), 404

    data        = request.get_json() or {}
    name        = data.get('name', '').strip()
    description = data.get('description', '').strip()
    date        = data.get('date')
    video_link  = data.get('video_link', '').strip() or None
    is_public   = bool(data.get('is_public', False))

    if not name:
        return jsonify({"error": "Event name is required"}), 400
    if not date:
        return jsonify({"error": "Event date is required"}), 400

    try:
        datetime.strptime(date, '%Y-%m-%d')
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400

    sql = """
        UPDATE EVENTS
        SET name = %s, description = %s, date = %s, video_link = %s, is_public = %s
        WHERE event_id = %s AND hall_id = %s
    """
    success = execute_write_query(
        sql,
        (name, description, date, video_link, is_public, event_id, current_hall_id)
    )

    if not success:
        return jsonify({"error": "Failed to update event"}), 500

    return jsonify({"message": "Event updated successfully"}), 200


@admin_bp.route('/events/<int:event_id>', methods=['DELETE'])
@token_required(allowed_roles=['admin'])
def delete_event(event_id):
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    # Ownership check — admin can only delete events belonging to their own hall
    owner_check = execute_read_query(
        "SELECT event_id FROM EVENTS WHERE event_id = %s AND hall_id = %s",
        (event_id, current_hall_id)
    )
    if not owner_check:
        return jsonify({"error": "Event not found or unauthorized"}), 404

    execute_write_query(
        "DELETE FROM EVENTS WHERE event_id = %s AND hall_id = %s",
        (event_id, current_hall_id)
    )

    return jsonify({"message": "Event deleted successfully"}), 200


# =============================================================================
# DONATIONS  —  Provost / Admin routes
# Drop these into admin_bp (routes.py) and remove the two old stub routes:
#   • GET  /donations/pending
#   • PUT  /donations/<id>/approve
# =============================================================================

# ---------------------------------------------------------------------------
# GET  /donations
# ---------------------------------------------------------------------------
# Query-string params:
#   page        int   (default 1)
#   limit       int   (default 10)
#   requester   str   "student" | "staff" | "all"  (default "all")
#   status      str   "Pending" | "Approved" | "Refused" | "all" (default "all")
# ---------------------------------------------------------------------------
@admin_bp.route('/donations', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_donations():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    # ── Pagination ──────────────────────────────────────────────────────────
    try:
        page  = max(1, int(request.args.get('page',  1)))
        limit = max(1, min(50, int(request.args.get('limit', 10))))
    except ValueError:
        return jsonify({"error": "page and limit must be integers"}), 400

    offset = (page - 1) * limit

    # ── Filters ──────────────────────────────────────────────────────────────
    requester_filter = request.args.get('requester', 'all').lower()
    status_filter    = request.args.get('status',    'all')

    valid_requesters = ('all', 'student', 'staff')
    valid_statuses   = ('all', 'Pending', 'Approved', 'Refused')

    if requester_filter not in valid_requesters:
        return jsonify({"error": f"requester must be one of {valid_requesters}"}), 400
    if status_filter not in valid_statuses:
        return jsonify({"error": f"status must be one of {valid_statuses}"}), 400

    # ── Base query ────────────────────────────────────────────────────────────
    # ASKS_FOR guarantees that at least one of student_id / staff_id is NOT NULL.
    # We LEFT JOIN both so a single row carries both potential requester types.
    base_sql = """
        FROM DONATIONS d
        JOIN ASKS_FOR af ON af.donation_id = d.donation_id
        LEFT JOIN STUDENTS st ON af.student_id = st.student_id
        LEFT JOIN STAFFS   sf ON af.staff_id   = sf.staff_id
        WHERE (st.hall_id = %(hall_id)s OR sf.hall_id = %(hall_id)s)
    """
    params = {"hall_id": current_hall_id}

    # ── Dynamic filters ───────────────────────────────────────────────────────
    if requester_filter == 'student':
        base_sql += " AND af.student_id IS NOT NULL AND af.staff_id IS NULL"
    elif requester_filter == 'staff':
        base_sql += " AND af.staff_id IS NOT NULL AND af.student_id IS NULL"

    if status_filter != 'all':
        base_sql += " AND d.status = %(status)s"
        params["status"] = status_filter

    # ── Count query ───────────────────────────────────────────────────────────
    count_sql    = "SELECT COUNT(*) AS total " + base_sql
    count_result = execute_read_query(count_sql, params)
    total_count  = count_result[0]['total'] if count_result else 0
    total_pages  = max(1, (total_count + limit - 1) // limit)

    # ── Data query ────────────────────────────────────────────────────────────
    select_sql = """
        SELECT
            d.donation_id,
            d.status,
            d.description,
            TO_CHAR(d.start_date, 'YYYY-MM-DD') AS start_date,
            TO_CHAR(d.end_date,   'YYYY-MM-DD') AS end_date,
            -- Requester identity
            CASE
                WHEN af.student_id IS NOT NULL THEN 'student'
                ELSE 'staff'
            END AS requester_type,
            COALESCE(af.student_id, af.staff_id) AS requester_id,
            COALESCE(st.name, sf.name)            AS requester_name,
            COALESCE(st.phone_number, sf.phone_number) AS requester_phone
    """ + base_sql + """
        ORDER BY d.start_date DESC, d.donation_id DESC
        LIMIT %(limit)s OFFSET %(offset)s
    """
    params["limit"]  = limit
    params["offset"] = offset

    donations = execute_read_query(select_sql, params)

    return jsonify({
        "donations": donations if donations else [],
        "pagination": {
            "page":        page,
            "limit":       limit,
            "total_items": total_count,
            "total_pages": total_pages
        }
    }), 200


# ---------------------------------------------------------------------------
# GET  /donations/<donation_id>
# ---------------------------------------------------------------------------
# Returns the full detail of a single donation entry so the frontend can
# show the expanded view without a separate data fetch if the list already
# contains all fields — but having this endpoint is cleaner and keeps payloads
# small in the list view.
# ---------------------------------------------------------------------------
@admin_bp.route('/donations/<int:donation_id>', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_donation_detail(donation_id):
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    sql = """
        SELECT
            d.donation_id,
            d.status,
            d.description,
            TO_CHAR(d.start_date, 'YYYY-MM-DD') AS start_date,
            TO_CHAR(d.end_date,   'YYYY-MM-DD') AS end_date,
            -- Requester identity
            CASE
                WHEN af.student_id IS NOT NULL THEN 'student'
                ELSE 'staff'
            END AS requester_type,
            COALESCE(af.student_id, af.staff_id) AS requester_id,
            COALESCE(st.name, sf.name)            AS requester_name,
            COALESCE(st.phone_number, sf.phone_number) AS requester_phone,
            -- Payment info (only present once the donation has generated a payment)
            p.payment_id,
            p.payment_type,
            p.amount,
            p.status  AS payment_status,
            TO_CHAR(p.due_time,  'YYYY-MM-DD HH24:MI') AS due_time,
            TO_CHAR(p.paid_at,   'YYYY-MM-DD HH24:MI') AS paid_at
        FROM DONATIONS d
        JOIN ASKS_FOR af ON af.donation_id = d.donation_id
        LEFT JOIN STUDENTS st ON af.student_id = st.student_id
        LEFT JOIN STAFFS   sf ON af.staff_id   = sf.staff_id
        LEFT JOIN GENERATES g ON g.donation_id  = d.donation_id
        LEFT JOIN PAYMENTS  p ON p.payment_id   = g.payment_id
        WHERE d.donation_id = %s
          AND (st.hall_id = %s OR sf.hall_id = %s)
    """
    result = execute_read_query(sql, (donation_id, current_hall_id, current_hall_id))

    if not result:
        return jsonify({"error": "Donation not found or does not belong to your hall"}), 404

    return jsonify(result[0]), 200


# ---------------------------------------------------------------------------
# PUT  /donations/<donation_id>/status
# ---------------------------------------------------------------------------
# Body (JSON):
#   { "status": "Approved" | "Refused" }
#
# One endpoint handles both Approve and Refuse so the frontend has a single
# contract; the old separate /approve route is superseded by this.
# ---------------------------------------------------------------------------
@admin_bp.route('/donations/<int:donation_id>/status', methods=['PUT', 'OPTIONS'])
@token_required(allowed_roles=['admin'])
def update_donation_status(donation_id):
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 200

    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)

    data       = request.get_json() or {}
    new_status = data.get('status', '').strip()

    if new_status not in ('Approved', 'Refused'):
        return jsonify({"error": "status must be 'Approved' or 'Refused'"}), 400

    # Confirm the donation belongs to this hall and is still Pending
    verify_sql = """
        SELECT d.donation_id, d.status
        FROM DONATIONS d
        JOIN ASKS_FOR af ON af.donation_id = d.donation_id
        LEFT JOIN STUDENTS st ON af.student_id = st.student_id
        LEFT JOIN STAFFS   sf ON af.staff_id   = sf.staff_id
        WHERE d.donation_id = %s
          AND (st.hall_id = %s OR sf.hall_id = %s)
    """
    existing = execute_read_query(verify_sql, (donation_id, current_hall_id, current_hall_id))

    if not existing:
        return jsonify({"error": "Donation not found or does not belong to your hall"}), 404

    if existing[0]['status'] != 'Pending':
        return jsonify({
            "error": f"Donation has already been {existing[0]['status'].lower()} and cannot be changed"
        }), 409

    update_sql = "UPDATE DONATIONS SET status = %s WHERE donation_id = %s"
    success    = execute_write_query(update_sql, (new_status, donation_id))

    if not success:
        return jsonify({"error": "Failed to update donation status"}), 500

    action = "approved" if new_status == "Approved" else "refused"
    return jsonify({
        "message":     f"Donation request {action} successfully",
        "donation_id": donation_id,
        "new_status":  new_status
    }), 200

#Complaints


@admin_bp.route('/complaints', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_all_complaints():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)
 
    # ── Pagination ──────────────────────────────────────────────────────────
    try:
        page  = max(1, int(request.args.get('page',  1)))
        limit = max(1, min(50, int(request.args.get('limit', 10))))
    except ValueError:
        return jsonify({"error": "page and limit must be integers"}), 400
 
    offset = (page - 1) * limit
 
    # ── Filters ──────────────────────────────────────────────────────────────
    status_filter     = request.args.get('status',     'all')
    type_filter       = request.args.get('type',       'all')
    visibility_filter = request.args.get('visibility', 'all')
    sort_by           = request.args.get('sort',       'newest')
 
    valid_statuses    = ('all', 'Pending', 'Resolved', 'Dismissed')
    valid_types       = ('all', 'Room', 'Dining', 'Toilet', 'Roommate', 'Staff', 'Facilities', 'Other')
    valid_visibilities = ('all', 'public', 'private')
    valid_sorts       = ('newest', 'oldest', 'upvotes')
 
    if status_filter not in valid_statuses:
        return jsonify({"error": f"status must be one of {valid_statuses}"}), 400
    if type_filter not in valid_types:
        return jsonify({"error": f"type must be one of {valid_types}"}), 400
    if visibility_filter not in valid_visibilities:
        return jsonify({"error": f"visibility must be one of {valid_visibilities}"}), 400
    if sort_by not in valid_sorts:
        return jsonify({"error": f"sort must be one of {valid_sorts}"}), 400
 
    # ── Dynamic WHERE clauses ─────────────────────────────────────────────────
    # Hall scoping is mandatory — provost only sees their own hall.
    where_clauses = ["s.hall_id = %s"]
    params        = [current_hall_id]
 
    if status_filter != 'all':
        where_clauses.append("c.status = %s")
        params.append(status_filter)
 
    if type_filter != 'all':
        where_clauses.append("c.complaint_type = %s")
        params.append(type_filter)
 
    if visibility_filter == 'public':
        where_clauses.append("c.is_public = TRUE")
    elif visibility_filter == 'private':
        where_clauses.append("c.is_public = FALSE")
 
    where_sql = "WHERE " + " AND ".join(where_clauses)
 
    # ── Sort order ────────────────────────────────────────────────────────────
    order_map = {
        "newest":  "c.date DESC,  c.complaint_id DESC",
        "oldest":  "c.date ASC,   c.complaint_id ASC",
        "upvotes": "upvote_count DESC, c.date DESC",
    }
    order_sql = order_map[sort_by]
 
    # ── Base fragment (reused for count + data query) ─────────────────────────
    # Upvote count is always computed so the list can display it regardless
    # of whether the complaint is public.
    # Identity: real name only when is_anonymous = FALSE.
    base_fragment = """
        FROM COMPLAINTS c
        JOIN STUDENTS s ON c.student_id = s.student_id
        LEFT JOIN (
            SELECT complaint_id, COUNT(*) AS upvote_count
            FROM COMPLAINT_UPVOTES
            GROUP BY complaint_id
        ) uv ON uv.complaint_id = c.complaint_id
        {where_sql}
    """.format(where_sql=where_sql)
 
    # ── Count query ───────────────────────────────────────────────────────────
    count_sql    = "SELECT COUNT(*) AS total " + base_fragment
    count_result = execute_read_query(count_sql, tuple(params))
    total_count  = count_result[0]['total'] if count_result else 0
    total_pages  = max(1, (total_count + limit - 1) // limit)
 
    # ── Data query ────────────────────────────────────────────────────────────
    select_sql = """
        SELECT
            c.complaint_id,
            c.complaint_type                                  AS type,
            c.status,
            c.is_public,
            c.is_anonymous,
            TO_CHAR(c.date, 'YYYY-MM-DD')                    AS date,
            -- Mask identity when the student chose anonymity
            CASE
                WHEN c.is_anonymous THEN 'Anonymous Resident'
                ELSE s.name
            END                                               AS author_name,
            -- Never expose the real student_id for anonymous complaints
            CASE
                WHEN c.is_anonymous THEN NULL
                ELSE c.student_id
            END                                               AS student_id,
            COALESCE(uv.upvote_count, 0)                     AS upvote_count,
            -- Truncated description for list card (full text in detail endpoint)
            LEFT(c.description, 160)                          AS description_preview,
            (LENGTH(c.description) > 160)                    AS is_truncated
    """ + base_fragment + """
        ORDER BY {order_sql}
        LIMIT %s OFFSET %s
    """.format(order_sql=order_sql)
 
    data_params = tuple(params) + (limit, offset)
    complaints  = execute_read_query(select_sql, data_params)
 
    return jsonify({
        "complaints": complaints if complaints else [],
        "pagination": {
            "page":        page,
            "limit":       limit,
            "total_items": total_count,
            "total_pages": total_pages
        }
    }), 200
 
 
# ---------------------------------------------------------------------------
# GET  /complaints/<complaint_id>
# ---------------------------------------------------------------------------
# Full detail for the expanded view.
# Also returns the list of upvoters (student_id only) so the frontend can
# show "12 students supported this" without exposing names.
# ---------------------------------------------------------------------------
@admin_bp.route('/complaints/<int:complaint_id>', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_complaint_detail(complaint_id):
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)
 
    sql = """
        SELECT
            c.complaint_id,
            c.complaint_type                                    AS type,
            c.description,
            c.status,
            c.is_public,
            c.is_anonymous,
            TO_CHAR(c.date, 'YYYY-MM-DD')                      AS date,
            CASE
                WHEN c.is_anonymous THEN 'Anonymous Resident'
                ELSE s.name
            END                                                 AS author_name,
            CASE
                WHEN c.is_anonymous THEN NULL
                ELSE c.student_id
            END                                                 AS student_id,
            CASE
                WHEN c.is_anonymous THEN NULL
                ELSE s.phone_number
            END                                                 AS author_phone,
            COALESCE(get_department_name(
                CASE WHEN c.is_anonymous THEN NULL ELSE c.student_id END
            ), '')                                              AS author_department,
            -- Upvote summary
            (
                SELECT COUNT(*)
                FROM COMPLAINT_UPVOTES cu
                WHERE cu.complaint_id = c.complaint_id
            )                                                   AS upvote_count
        FROM COMPLAINTS c
        JOIN STUDENTS s ON c.student_id = s.student_id
        WHERE c.complaint_id = %s
          AND s.hall_id = %s
    """
    result = execute_read_query(sql, (complaint_id, current_hall_id))
 
    if not result:
        return jsonify({"error": "Complaint not found or does not belong to your hall"}), 404
 
    return jsonify(result[0]), 200
 
 
# ---------------------------------------------------------------------------
# PUT  /complaints/<complaint_id>/status
# ---------------------------------------------------------------------------
# Body (JSON):
#   { "status": "Resolved" | "Dismissed" }
#
# Only Pending complaints can be actioned.
# Once Resolved or Dismissed the status is locked to prevent accidental
# re-flagging (return 409 if already processed).
# ---------------------------------------------------------------------------
@admin_bp.route('/complaints/<int:complaint_id>/status', methods=['PUT', 'OPTIONS'])
@token_required(allowed_roles=['admin'])
def update_complaint_status(complaint_id):
    if request.method == 'OPTIONS':
        return '', 200
 
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)
 
    data       = request.get_json() or {}
    new_status = data.get('status', '').strip()
 
    if new_status not in ('Resolved', 'Dismissed'):
        return jsonify({"error": "status must be 'Resolved' or 'Dismissed'"}), 400
 
    # ── Ownership + current-status check (single query) ───────────────────────
    verify_sql = """
        SELECT c.complaint_id, c.status
        FROM COMPLAINTS c
        JOIN STUDENTS s ON c.student_id = s.student_id
        WHERE c.complaint_id = %s
          AND s.hall_id = %s
    """
    existing = execute_read_query(verify_sql, (complaint_id, current_hall_id))
 
    if not existing:
        return jsonify({"error": "Complaint not found or does not belong to your hall"}), 404
 
    current_status = existing[0]['status']
    if current_status != 'Pending':
        return jsonify({
            "error": f"Complaint has already been {current_status.lower()} and cannot be changed"
        }), 409
 
    # ── Update ────────────────────────────────────────────────────────────────
    update_sql = "UPDATE COMPLAINTS SET status = %s WHERE complaint_id = %s"
    success    = execute_write_query(update_sql, (new_status, complaint_id))
 
    if not success:
        return jsonify({"error": "Failed to update complaint status"}), 500
 
    action = new_status.lower()
    return jsonify({
        "message":      f"Complaint marked as {action}",
        "complaint_id": complaint_id,
        "new_status":   new_status
    }), 200
 
 
# ---------------------------------------------------------------------------
# GET  /complaints/summary
# ---------------------------------------------------------------------------
# Lightweight stats card for a dashboard widget — total counts per status
# and per type, scoped to the current hall.
# No pagination needed; this is always a single aggregated response.
# ---------------------------------------------------------------------------
@admin_bp.route('/complaints/summary', methods=['GET'])
@token_required(allowed_roles=['admin'])
def get_complaints_summary():
    current_admin_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_admin_id)
 
    # ── Status breakdown ──────────────────────────────────────────────────────
    status_sql = """
        SELECT
            c.status,
            COUNT(*) AS count
        FROM COMPLAINTS c
        JOIN STUDENTS s ON c.student_id = s.student_id
        WHERE s.hall_id = %s
        GROUP BY c.status
    """
    status_rows = execute_read_query(status_sql, (current_hall_id,))
    status_counts = {row['status']: row['count'] for row in (status_rows or [])}
 
    # ── Type breakdown ────────────────────────────────────────────────────────
    type_sql = """
        SELECT
            c.complaint_type AS type,
            COUNT(*)         AS count
        FROM COMPLAINTS c
        JOIN STUDENTS s ON c.student_id = s.student_id
        WHERE s.hall_id = %s
        GROUP BY c.complaint_type
        ORDER BY count DESC
    """
    type_rows = execute_read_query(type_sql, (current_hall_id,))
 
    # ── Most upvoted public complaint ─────────────────────────────────────────
    top_sql = """
        SELECT
            c.complaint_id,
            c.complaint_type  AS type,
            LEFT(c.description, 120) AS description_preview,
            TO_CHAR(c.date, 'YYYY-MM-DD') AS date,
            COUNT(cu.student_id) AS upvote_count
        FROM COMPLAINTS c
        JOIN STUDENTS s          ON c.student_id  = s.student_id
        LEFT JOIN COMPLAINT_UPVOTES cu ON cu.complaint_id = c.complaint_id
        WHERE s.hall_id = %s
          AND c.is_public = TRUE
          AND c.status    = 'Pending'
        GROUP BY c.complaint_id, c.complaint_type, c.description, c.date
        ORDER BY upvote_count DESC, c.date DESC
        LIMIT 1
    """
    top_result = execute_read_query(top_sql, (current_hall_id,))
 
    return jsonify({
        "by_status": {
            "Pending":   status_counts.get('Pending',   0),
            "Resolved":  status_counts.get('Resolved',  0),
            "Dismissed": status_counts.get('Dismissed', 0),
        },
        "by_type":         type_rows if type_rows else [],
        "top_upvoted":     top_result[0] if top_result else None
    }), 200