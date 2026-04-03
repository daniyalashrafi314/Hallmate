from flask import Blueprint, request, jsonify
from datetime import datetime, date
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
