from flask import Blueprint, request, jsonify, Response
from app.db import execute_read_query, execute_write_query
from app.email_service import send_welcome_email
import re
import secrets
import string
from app.auth.middleware import token_required
from app.security.passwords import hash_password

# 1. Define the Blueprint
staff_bp = Blueprint('staff', __name__)

# --- HELPER FUNCTION ---
def get_current_hall_id(staff_id):
    """Dynamically fetches the hall_id for the currently logged-in staff member."""
    sql = "SELECT hall_id FROM STAFFS WHERE staff_id = %s"
    result = execute_read_query(sql, (staff_id,))
    return result[0]['hall_id'] if result else None


# --- 1) STAFF PROFILE PAGE ---

@staff_bp.route('/profile', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_profile():
    current_staff_id = request.current_user_id
    
    sql = """
        SELECT 
        s.staff_id,
        s.name AS staff_name,
        s.phone_number,
        s.role,
        s.hall_id,
        h.name AS hall_name,
        h.provost,
        u.email_address,
        (s.photo IS NOT NULL) AS has_photo
        FROM STAFFS s
        JOIN USERS u ON s.user_id = u.user_id
        JOIN HALLS h ON s.hall_id = h.hall_id
        WHERE s.staff_id = %s
    """
    profile = execute_read_query(sql, (current_staff_id,))
    
    if profile:
        return jsonify(profile[0])
    return jsonify({"error": "Staff not found"}), 404

@staff_bp.route('/profile/photo', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_profile_photo():
    current_staff_id = request.current_user_id
    
    sql = """
        SELECT photo
        FROM STAFFS
        WHERE staff_id = %s
        """
    result = execute_read_query(sql, (current_staff_id,))
    if not result or not result[0].get('photo'):
        return jsonify({"error": "No photo found"}), 404
    return Response(
        result[0]['photo'],
        mimetype='image/jpeg', 
        headers={"Content-Disposition": "inline; filename=profile_photo.jpg"}
    )

@staff_bp.route('/profile', methods=['PUT'])
@token_required(allowed_roles=['staff'])
def edit_profile():
    current_staff_id = request.current_user_id
    
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
        
    staff_update_values.append(current_staff_id)

    sql1 = f"""
            UPDATE STAFFS
            SET {', '.join(staff_update_fields)}
            WHERE staff_id = %s
            """
    execute_write_query(sql1, tuple(staff_update_values))
    
    sql2 = """
        UPDATE USERS
        SET email_address = %s
        WHERE user_id = (
            SELECT user_id
            FROM STAFFS
            WHERE staff_id = %s
        )"""
    execute_write_query(sql2, (email, current_staff_id))
    
    sql3 = """
        SELECT role, hall_id
        FROM STAFFS
        WHERE staff_id = %s
        """
    result = execute_read_query(sql3, (current_staff_id,)) 
    
    if result:
        role = result[0]["role"]
        hall_id = result[0]["hall_id"]

        if role and role.lower() == "provost":
            sql4 = """
            UPDATE HALLS
            SET provost = %s
            WHERE hall_id = %s
            """
            execute_write_query(sql4, (name, hall_id))

    return jsonify({"message": "Profile updated successfully"}), 200

@staff_bp.route('/change-password', methods=['PUT'])
@token_required(allowed_roles=['staff'])
def change_password():
    current_staff_id = request.current_user_id
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
    execute_write_query(sql, (hashed_password, current_staff_id))
    return jsonify({"message": "Password changed successfully"})

# --- 2) NOTICE PAGE (View & Create) ---

@staff_bp.route('/notices', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_notices():
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)
    
    try:
        limit = min(int(request.args.get('limit', 10)), 50)
        offset = int(request.args.get('offset', 0))
    except ValueError:
        return jsonify({"error": "Invalid pagination params"}), 400
        
    sql = """
        SELECT n.notice_id, 
        n.title, 
        n.description, 
        TO_CHAR(n.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at
        FROM NOTICE n
        JOIN STAFFS s ON n.staff_id = s.staff_id
        WHERE s.hall_id = %s
        ORDER BY n.created_at DESC
        LIMIT %s OFFSET %s;
    """
    notices = execute_read_query(sql, (current_hall_id, limit, offset))
    return jsonify({"data": notices}), 200

@staff_bp.route('/notices/<int:notice_id>', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_notice(notice_id):
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)
    
    sql = """
        SELECT n.notice_id, 
        n.title, 
        n.description, 
        TO_CHAR(n.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at, 
        s.staff_id, s.name, 
        (n.pdf_file IS NOT NULL) AS has_pdf
        FROM NOTICE n
        JOIN STAFFS s ON n.staff_id = s.staff_id
        WHERE n.notice_id = %s
        AND s.hall_id = %s
    """
    notice = execute_read_query(sql, (notice_id, current_hall_id))
    if not notice:
        return jsonify({"error": "Not Found"}), 404
    return jsonify(notice[0]), 200

@staff_bp.route('/notices/<int:notice_id>/pdf', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_notice_pdf(notice_id):
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)
    
    sql = """
        SELECT n.pdf_file
        FROM NOTICE n
        JOIN STAFFS s ON n.staff_id = s.staff_id
        WHERE n.notice_id = %s
        AND s.hall_id = %s
        """
    result = execute_read_query(sql, (notice_id, current_hall_id))
    if not result or not result[0].get('pdf_file'):
        return jsonify({"error": "No Pdf"}), 404
    return Response(
        result[0]['pdf_file'],
        mimetype='application/pdf',
        headers={"Content-Disposition": "inline; filename=notice.pdf"}
    )

@staff_bp.route('/notices', methods=['POST'])
@token_required(allowed_roles=['staff'])
def create_notice():
    current_staff_id = request.current_user_id

    title = request.form.get('title')
    description = request.form.get('description')
    pdf_file = request.files.get('pdf_file')

    pdf_bytes = None
    if pdf_file:
        pdf_bytes = pdf_file.read()
    if not title or title.strip() == "":
        return jsonify({"error": "Title is required"}), 400

    if len(title) > 150:
        return jsonify({"error": "Title too long"}), 400
    if pdf_file and not pdf_file.filename.endswith('.pdf'):
        return jsonify({"error": "Only PDF allowed"}), 400

    query = """
        INSERT INTO NOTICE (staff_id, title, description, pdf_file)
        VALUES (%s, %s, %s, %s)
        RETURNING notice_id;
    """
    values = (current_staff_id, title, description, pdf_bytes)
    result = execute_write_query(query, values)

    return jsonify({"notice_id": result}), 201

@staff_bp.route('/notices/<int:notice_id>', methods=['DELETE'])
@token_required(allowed_roles=['staff'])
def delete_notice(notice_id):
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)
    
    query = """
        DELETE FROM NOTICE n
        USING STAFFS s
        WHERE n.staff_id = s.staff_id
        AND n.notice_id = %s
        AND s.hall_id = %s
        RETURNING n.notice_id;
    """
    result = execute_write_query(query, (notice_id, current_hall_id))

    if not result:
        return jsonify({"error": "Unauthorized or not found"}), 403

    return jsonify({"message": "Deleted"}), 200

@staff_bp.route('/notices/count', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_notice_count():
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)
    
    search = request.args.get('search', '')

    query = """
        SELECT COUNT(*) as total
        FROM NOTICE n
        JOIN STAFFS s ON n.staff_id = s.staff_id
        WHERE s.hall_id = %s
        AND (n.title ILIKE %s OR n.description ILIKE %s);
    """
    result = execute_read_query(query, (current_hall_id, f"%{search}%", f"%{search}%"))
    return jsonify(result[0]), 200

# ---3) ADD PAYMENTS (STUDENTS)

@staff_bp.route('/add-payments', methods=['POST'])
@token_required(allowed_roles=['staff'])
def add_payments():
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)
    
    data = request.get_json()
    student_ids = data.get("student_ids")
    payment_type = data.get("payment_type")
    amount = data.get("amount")
    due_time = data.get("due_time")
    
    if not student_ids or not amount or not due_time or not payment_type:
        return jsonify({"error":"Missing fields"}), 400
    
    sql = """
    SELECT student_id
    FROM STUDENTS
    WHERE student_id = ANY(%s)
    AND hall_id = %s
    """
    valid_students = execute_read_query(sql, (student_ids, current_hall_id))
    if not valid_students:
        return jsonify({"error": "No valid students found"}), 400
        
    sql_payment ="""
    INSERT INTO PAYMENTS (payment_type, amount, due_time, status)
    VALUES (%s, %s, %s, %s)
    RETURNING payment_id
    """
    sql_fees = """
        INSERT INTO FEES (payment_id, student_id)
        VALUES (%s, %s)
        """
    created_count = 0
    for student in valid_students:
        payment_result = execute_write_query(
            sql_payment,
            (payment_type, amount, due_time, "Due"),
            return_result=True
        )
        payment_id = payment_result[0]["payment_id"]
        execute_write_query(sql_fees, (payment_id, student["student_id"]))
        created_count += 1
        
    return jsonify({
        "message": "Payment notices created successfully",
        "count": created_count
    })

@staff_bp.route('/students', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_students():
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)
    
    search = request.args.get("search")
    room = request.args.get("room")
    batch = request.args.get("batch")
    
    sql = """
        SELECT s.student_id, s.name, a.room_id
        FROM STUDENTS s
        LEFT JOIN ALLOCATIONS a ON s.student_id = a.student_id
        WHERE s.hall_id = %s
        """
    params = [current_hall_id]
    
    if room:
        sql += " AND a.room_id = %s"
        params.append(room)
    if batch:
        sql += " AND SUBSTR(s.student_id, 1, 2) = %s"
        params.append(batch)
    if search:
        sql += " AND (s.name ILIKE %s OR s.student_id LIKE %s)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")

    students = execute_read_query(sql, tuple(params))
    return jsonify(students)

@staff_bp.route('/rooms', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_rooms():
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)
    
    sql1 = """
        SELECT room_id
        FROM ROOMS
        WHERE hall_id = %s
    """
    rooms = execute_read_query(sql1, (current_hall_id,))
    return jsonify(rooms)

@staff_bp.route('/batches', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_batches():
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)
    
    sql = """ 
    SELECT DISTINCT SUBSTR(student_id, 1, 2) AS batch
    FROM STUDENTS
    WHERE hall_id = %s
    """
    batches = execute_read_query(sql, (current_hall_id,))
    return jsonify(batches)

# ===========================================================
# --- PAYMENTS: VIEW / SEARCH / FILTER  (sub-page tab 1) ---
# ===========================================================

VALID_PAYMENT_STATUSES        = {'Due', 'Paid', 'Overdue'}
VALID_DELETE_REQUEST_STATUSES = {'Pending', 'Refused'}

@staff_bp.route('/payments', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_payments():
    """
    Paginated, filterable list of all student fee payments for this hall.
    Query params:
      search        – student name or student_id (ILIKE)
      payment_type  – exact match e.g. 'Dining', 'Seat'
      status        – 'Due' | 'Paid' | 'Overdue'
      year          – 4-digit year of due_time
      month         – 1-12
      limit / offset
    """
    current_staff_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_staff_id)

    try:
        limit  = min(int(request.args.get('limit',  10)), 50)
        offset = int(request.args.get('offset', 0))
    except ValueError:
        return jsonify({"error": "Invalid pagination params"}), 400

    search       = request.args.get('search',       None)
    payment_type = request.args.get('payment_type', None)
    status       = request.args.get('status',       None)
    year         = request.args.get('year',         None)
    month        = request.args.get('month',        None)

    if status and status not in VALID_PAYMENT_STATUSES:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(VALID_PAYMENT_STATUSES)}"}), 400

    base = """
        FROM PAYMENTS p
        JOIN FEES f     ON p.payment_id = f.payment_id
        JOIN STUDENTS s ON f.student_id = s.student_id
        LEFT JOIN PAYMENT_DELETE_REQUESTS dr
               ON p.payment_id = dr.payment_id AND dr.status = 'Pending'
        WHERE s.hall_id = %s
    """
    params = [current_hall_id]

    if payment_type:
        base += " AND p.payment_type = %s"; params.append(payment_type)
    if status:
        base += " AND p.status = %s";       params.append(status)
    if year:
        base += " AND EXTRACT(YEAR  FROM p.due_time) = %s"; params.append(year)
    if month:
        base += " AND EXTRACT(MONTH FROM p.due_time) = %s"; params.append(month)
    if search:
        base += " AND (s.name ILIKE %s OR s.student_id LIKE %s)"
        params += [f"%{search}%", f"%{search}%"]

    count_params = list(params)

    sql = f"""
        SELECT
            p.payment_id,
            p.payment_type,
            p.amount,
            p.status,
            TO_CHAR(p.due_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_time,
            TO_CHAR(p.paid_at,  'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS paid_at,
            f.student_id,
            s.name AS student_name,
            (dr.request_id IS NOT NULL) AS delete_pending
        {base}
        ORDER BY p.due_time DESC NULLS LAST
        LIMIT %s OFFSET %s
    """
    params += [limit, offset]
    payments = execute_read_query(sql, tuple(params))

    count_sql = f"SELECT COUNT(*) AS total {base}"
    total_row = execute_read_query(count_sql, tuple(count_params))
    total     = total_row[0]['total'] if total_row else 0

    return jsonify({
        "data": payments,
        "pagination": {"limit": limit, "offset": offset, "total": total}
    }), 200


@staff_bp.route('/payments/<int:payment_id>', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_payment_detail(payment_id):
    """Single payment detail — guards against cross-hall access."""
    current_staff_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_staff_id)

    sql = """
        SELECT
            p.payment_id, p.payment_type, p.amount, p.status,
            TO_CHAR(p.due_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_time,
            TO_CHAR(p.paid_at,  'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS paid_at,
            f.student_id,
            s.name         AS student_name,
            s.phone_number AS student_phone,
            dr.request_id  AS delete_request_id,
            dr.status      AS delete_request_status
        FROM PAYMENTS p
        JOIN FEES f     ON p.payment_id = f.payment_id
        JOIN STUDENTS s ON f.student_id = s.student_id
        LEFT JOIN PAYMENT_DELETE_REQUESTS dr ON p.payment_id = dr.payment_id
        WHERE p.payment_id = %s
          AND s.hall_id    = %s
    """
    result = execute_read_query(sql, (payment_id, current_hall_id))
    if not result:
        return jsonify({"error": "Payment not found or unauthorized"}), 404
    return jsonify(result[0]), 200


# ================================================================
# --- PAYMENTS: SOFT-DELETE FLOW (sub-page tab 2)             ---
# Staff flags → provost confirms → payment actually deleted     ---
# ================================================================

@staff_bp.route('/payments/<int:payment_id>/delete-request', methods=['POST'])
@token_required(allowed_roles=['staff'])
def request_payment_deletion(payment_id):
    current_staff_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_staff_id)

    check_sql = """
        SELECT p.payment_id, p.status
        FROM PAYMENTS p
        JOIN FEES f     ON p.payment_id = f.payment_id
        JOIN STUDENTS s ON f.student_id = s.student_id
        WHERE p.payment_id = %s AND s.hall_id = %s
    """
    result = execute_read_query(check_sql, (payment_id, current_hall_id))
    
    if not result:
        return jsonify({"error": "Payment not found or unauthorized"}), 404

    # ← ADD THIS CHECK
    if result[0]['status'] == 'Paid':
        return jsonify({"error": "Paid payments cannot be deleted"}), 400

    sql = """
        INSERT INTO PAYMENT_DELETE_REQUESTS (payment_id, requested_by)
        VALUES (%s, %s)
        ON CONFLICT (payment_id) DO NOTHING
        RETURNING request_id
    """
    result = execute_write_query(sql, (payment_id, current_staff_id), return_result=True)
    if not result:
        return jsonify({"error": "A delete request for this payment already exists"}), 409

    return jsonify({
        "message": "Delete request submitted. Awaiting provost approval.",
        "request_id": result[0]['request_id']
    }), 201


@staff_bp.route('/payments/delete-requests', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_delete_requests():
    """
    List delete requests.
    - Clerk/Guard sees only their own requests.
    - Provost sees ALL requests for the hall.
    Query params:
      status  – 'Pending' | 'Refused'  (default: 'Pending')
      limit / offset
    """
    current_staff_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_staff_id)

    role_row = execute_read_query(
        "SELECT role FROM STAFFS WHERE staff_id = %s", (current_staff_id,)
    )
    role = role_row[0]['role'] if role_row else None

    try:
        limit  = min(int(request.args.get('limit',  10)), 50)
        offset = int(request.args.get('offset', 0))
    except ValueError:
        return jsonify({"error": "Invalid pagination params"}), 400

    status_filter = request.args.get('status', 'Pending')
    if status_filter not in VALID_DELETE_REQUEST_STATUSES:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(VALID_DELETE_REQUEST_STATUSES)}"}), 400

    is_provost = role and role.lower() == 'provost'

    base = """
        FROM PAYMENT_DELETE_REQUESTS dr
        JOIN PAYMENTS  p        ON dr.payment_id   = p.payment_id
        JOIN FEES      f        ON p.payment_id    = f.payment_id
        JOIN STUDENTS  s        ON f.student_id    = s.student_id
        JOIN STAFFS    st_req   ON dr.requested_by = st_req.staff_id
        LEFT JOIN STAFFS st_rev ON dr.reviewed_by  = st_rev.staff_id
        WHERE s.hall_id = %s
          AND dr.status = %s
    """
    params = [current_hall_id, status_filter]

    if not is_provost:
        base += " AND dr.requested_by = %s"
        params.append(current_staff_id)

    count_params = list(params)

    sql = f"""
        SELECT
            dr.request_id,
            dr.payment_id,
            dr.status        AS request_status,
            TO_CHAR(dr.requested_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS requested_at,
            TO_CHAR(dr.reviewed_at,  'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS reviewed_at,
            st_req.name      AS requested_by_name,
            st_rev.name      AS reviewed_by_name,
            p.payment_type,
            p.amount,
            p.status         AS payment_status,
            TO_CHAR(p.due_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS due_time,
            f.student_id,
            s.name           AS student_name
        {base}
        ORDER BY dr.requested_at DESC
        LIMIT %s OFFSET %s
    """
    params += [limit, offset]
    requests = execute_read_query(sql, tuple(params))

    count_sql = f"SELECT COUNT(*) AS total {base}"
    total_row = execute_read_query(count_sql, tuple(count_params))
    total     = total_row[0]['total'] if total_row else 0

    return jsonify({
        "data": requests,
        "pagination": {"limit": limit, "offset": offset, "total": total}
    }), 200


@staff_bp.route('/payments/delete-requests/<int:request_id>', methods=['DELETE'])
@token_required(allowed_roles=['staff'])
def cancel_delete_request(request_id):
    """Staff cancels their own pending delete request."""
    current_staff_id = request.current_user_id

    sql = """
        DELETE FROM PAYMENT_DELETE_REQUESTS
        WHERE request_id   = %s
          AND requested_by = %s
          AND status       = 'Pending'
        RETURNING request_id
    """
    result = execute_write_query(sql, (request_id, current_staff_id), return_result=True)
    if not result:
        return jsonify({"error": "Request not found, already reviewed, or unauthorized"}), 403

    return jsonify({"message": "Delete request cancelled"}), 200


@staff_bp.route('/payments/delete-requests/<int:request_id>/review', methods=['PUT'])
@token_required(allowed_roles=['staff'])
def review_delete_request(request_id):
    """
    Provost-only.
    body: { "action": "Approve" } → hard deletes the payment, request row vanishes via CASCADE
    body: { "action": "Refuse"  } → request marked Refused, payment stays
    """
    current_staff_id = request.current_user_id

    role_row = execute_read_query(
        "SELECT role FROM STAFFS WHERE staff_id = %s", (current_staff_id,)
    )
    if not role_row or role_row[0]['role'].lower() != 'provost':
        return jsonify({"error": "Only the provost can review delete requests"}), 403

    data   = request.get_json() or {}
    action = data.get('action')

    if action not in ('Approve', 'Refuse'):
        return jsonify({"error": "action must be 'Approve' or 'Refuse'"}), 400

    if action == 'Approve':
        # Fetch the payment_id first, then delete the payment.
        # CASCADE on PAYMENT_DELETE_REQUESTS handles the request row automatically.
        fetch_sql = """
            SELECT payment_id FROM PAYMENT_DELETE_REQUESTS
            WHERE request_id = %s AND status = 'Pending'
        """
        result = execute_read_query(fetch_sql, (request_id,))
        if not result:
            return jsonify({"error": "Request not found or already reviewed"}), 404

        execute_write_query(
            "DELETE FROM PAYMENTS WHERE payment_id = %s",
            (result[0]['payment_id'],)
        )
        return jsonify({"message": "Payment deleted successfully"}), 200

    # action == 'Refuse'
    refuse_sql = """
        UPDATE PAYMENT_DELETE_REQUESTS
        SET status      = 'Refused',
            reviewed_by = %s,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE request_id = %s
          AND status     = 'Pending'
        RETURNING request_id
    """
    result = execute_write_query(
        refuse_sql, (current_staff_id, request_id), return_result=True
    )
    if not result:
        return jsonify({"error": "Request not found or already reviewed"}), 404

    return jsonify({"message": "Delete request refused"}), 200
# --- 3) MY PAYMENTS (Salary) ---

@staff_bp.route('/salary', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_paginated_salary():
    current_staff_id = request.current_user_id
    
    try:
        limit = min(int(request.args.get('limit', 10)), 50)  
        offset = int(request.args.get('offset', 0))
    except ValueError:
        return jsonify({"error": "Invalid pagination parameters"}), 400

    sql = """
        SELECT 
            p.payment_id, 
            p.payment_type, 
            p.amount, 
            p.status, 
            p.due_time, 
            p.paid_at
        FROM PAYMENTS p
        JOIN SALARY s ON p.payment_id = s.payment_id
        WHERE s.staff_id = %s
        ORDER BY p.due_time DESC NULLS LAST
        LIMIT %s OFFSET %s;
    """
    salaries = execute_read_query(sql, (current_staff_id, limit, offset))
    
    count_sql = """
        SELECT COUNT(*) as total
        FROM PAYMENTS p
        JOIN SALARY s ON p.payment_id = s.payment_id
        WHERE s.staff_id = %s
    """
    total_count = execute_read_query(count_sql, (current_staff_id,))
    total = total_count[0]['total'] if total_count else 0

    return jsonify({
        "data": salaries,
        "pagination": {
            "limit": limit,
            "offset": offset,
            "total": total
        }
    }), 200

@staff_bp.route('/salary/<int:payment_id>', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_salary_details(payment_id):
    current_staff_id = request.current_user_id
   
    sql = """
        SELECT 
            p.payment_id, 
            p.payment_type, 
            p.amount AS payment_amount, 
            p.status, 
            p.due_time, 
            p.paid_at,
            st.staff_id,
            st.name AS staff_name,
            st.role AS staff_role,
            st.salary AS base_salary
        FROM PAYMENTS p
        JOIN SALARY s ON p.payment_id = s.payment_id
        JOIN STAFFS st ON s.staff_id = st.staff_id
        WHERE p.payment_id = %s 
        AND s.staff_id = %s;
    """
    salary_detail = execute_read_query(sql, (payment_id, current_staff_id))

    if not salary_detail:
        return jsonify({"error": "Salary payment not found or unauthorized access"}), 404

    return jsonify(salary_detail[0]), 200

# --- 4) ASK FOR DONATIONS ---

@staff_bp.route('/donations', methods=['GET'])
@token_required(allowed_roles=['staff'])
def list_donations():
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
    return jsonify(donations), 200

@staff_bp.route('/donations', methods=['POST'])
@token_required(allowed_roles=['staff'])
def create_staff_donation_request():
    current_staff_id = request.current_user_id
    
    data = request.get_json()
    desc = data.get('description')
    end_date = data.get('endDate')

    if not desc or not end_date:
        return jsonify({"error": "Description and end date are required"}), 400

    sql = """
        WITH new_donation AS (
            INSERT INTO DONATIONS (description, end_date, status) 
            VALUES (%s, %s, 'Pending') 
            RETURNING donation_id
        )
        INSERT INTO ASKS_FOR (donation_id, staff_id, student_id)
        SELECT donation_id, %s, NULL FROM new_donation;
    """
    success = execute_write_query(sql, (desc, end_date, current_staff_id))
    
    if success:
        return jsonify({"message": "Staff donation request created"}), 201
    return jsonify({"error": "Failed to create donation request"}), 500

@staff_bp.route('/donations/<int:donation_id>', methods=['DELETE'])
@token_required(allowed_roles=['staff'])
def delete_own_donation(donation_id):
    current_staff_id = request.current_user_id
    
    sql = """
        DELETE FROM DONATIONS 
        WHERE donation_id = %s 
        AND status = 'Pending'
        AND donation_id IN (
            SELECT donation_id FROM ASKS_FOR WHERE staff_id = %s
        )
    """
    success = execute_write_query(sql, (donation_id, current_staff_id))
    
    if success:
        return jsonify({"message": "Donation request removed"}), 200
    return jsonify({"error": "Unauthorized or donation already processed"}), 403

# --- 6) SEAT APPLICATIONS (Paginated & Details) ---

@staff_bp.route('/seat-applications', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_paginated_applications():
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)
    
    try:
        search = request.args.get("search")
        limit = min(int(request.args.get('limit', 10)), 50)
        offset = int(request.args.get('offset', 0))
        status_filter = request.args.get('status', 'Pending') 
    except ValueError:
        return jsonify({"error": "Invalid pagination params"}), 400
   
    sql = """
        SELECT 
            sa.application_id, 
            sa.student_id, 
            s.name AS student_name, 
            sa.date, 
            sa.priority_value, 
            sa.status
        FROM SEAT_APPLICATION sa
        JOIN STUDENTS s ON sa.student_id = s.student_id
        WHERE s.hall_id = %s AND sa.status = %s
    """
    params = [current_hall_id, status_filter]

    if search:
        sql += " AND (s.name ILIKE %s OR s.student_id LIKE %s)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")

    sql += """ 
        ORDER BY sa.priority_value DESC NULLS LAST, sa.date ASC
        LIMIT %s OFFSET %s;
    """
    count_params = list(params) 
    params.extend([limit, offset])
    
    applications = execute_read_query(sql, tuple(params))
    
    count_sql = """
        SELECT COUNT(*) as total
        FROM SEAT_APPLICATION sa
        JOIN STUDENTS s ON sa.student_id = s.student_id
        WHERE s.hall_id = %s AND sa.status = %s
    """
    if search:
        count_sql += " AND (s.name ILIKE %s OR s.student_id LIKE %s)"

    total_count = execute_read_query(count_sql, tuple(count_params))
    total = total_count[0]['total'] if total_count else 0

    return jsonify({
        "data": applications,
        "pagination": {
            "limit": limit,
            "offset": offset,
            "total": total
        }
    }), 200

@staff_bp.route('/seat-applications/<int:app_id>', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_application_details(app_id):
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)
    
    sql = """
        SELECT 
            sa.application_id, 
            sa.student_id, 
            sa.description, 
            sa.date, 
            sa.priority_value, 
            sa.status AS application_status,
            s.name AS student_name, 
            s.phone_number, 
            s.status AS student_status
        FROM SEAT_APPLICATION sa
        JOIN STUDENTS s ON sa.student_id = s.student_id
        WHERE sa.application_id = %s AND s.hall_id = %s;
    """
    app_details = execute_read_query(sql, (app_id, current_hall_id))
    
    if not app_details:
        return jsonify({"error": "Application not found or unauthorized access"}), 404
        
    return jsonify(app_details[0]), 200

@staff_bp.route('/seat-applications/<int:app_id>/priority', methods=['PUT'])
@token_required(allowed_roles=['staff'])
def update_application_priority(app_id):
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)
    
    data = request.get_json()
    new_priority = data.get('priority_value')
    
    if new_priority is None:
        return jsonify({"error": "Missing priority_value in request body"}), 400
        
    check_sql = """
        SELECT sa.application_id 
        FROM SEAT_APPLICATION sa
        JOIN STUDENTS s ON sa.student_id = s.student_id
        WHERE sa.application_id = %s AND s.hall_id = %s;
    """
    if not execute_read_query(check_sql, (app_id, current_hall_id)):
        return jsonify({"error": "Application not found or unauthorized access"}), 404

    update_sql = "UPDATE SEAT_APPLICATION SET priority_value = %s WHERE application_id = %s"
    success = execute_write_query(update_sql, (new_priority, app_id))
    
    if success:
        return jsonify({
            "message": "Priority updated successfully", 
            "priority_value": new_priority
        }), 200
        
    return jsonify({"error": "Failed to update priority"}), 500

# --- 8) STUDENT LIST & SEARCH ---

@staff_bp.route('/add-students', methods=['POST'])
@token_required(allowed_roles=['staff'])
def add_student():
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)
    
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

    # --- VISITOR LOG PAGE ---

@staff_bp.route('/visitors', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_visitors():
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)

    try:
        limit = min(int(request.args.get('limit', 10)), 50)
        offset = int(request.args.get('offset', 0))
    except ValueError:
        return jsonify({"error": "Invalid pagination params"}), 400

    year_filter  = request.args.get('year',  None)
    month_filter = request.args.get('month', None)
    day_filter   = request.args.get('day',   None)
    room_filter  = request.args.get('room',  None)
    search       = request.args.get('search', None)

    sql = """
        SELECT
            v.visitor_id,
            v.name            AS visitor_name,
            v.phone_number    AS visitor_phone,
            v.relationship,
            TO_CHAR(v.entry_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS entry_time,
            TO_CHAR(v.exit_time,  'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS exit_time,
            s.student_id,
            s.name            AS student_name,
            a.room_id
        FROM VISITORS v
        JOIN STUDENTS s  ON v.student_id = s.student_id
        LEFT JOIN ALLOCATIONS a ON s.student_id = a.student_id AND a.end_date IS NULL
        WHERE s.hall_id = %s
    """
    params = [current_hall_id]

    if not year_filter and not month_filter and not day_filter:
        sql += " AND v.entry_time::DATE = CURRENT_DATE"
    else:
        if year_filter:
            sql += " AND EXTRACT(YEAR  FROM v.entry_time) = %s"
            params.append(year_filter)
        if month_filter:
            sql += " AND EXTRACT(MONTH FROM v.entry_time) = %s"
            params.append(month_filter)
        if day_filter:
            sql += " AND EXTRACT(DAY   FROM v.entry_time) = %s"
            params.append(day_filter)

    if room_filter:
        sql += " AND a.room_id = %s"
        params.append(room_filter)

    if search:
        sql += " AND (s.name ILIKE %s OR s.student_id LIKE %s)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")

    count_params = list(params)

    sql += " ORDER BY v.entry_time DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    visitors = execute_read_query(sql, tuple(params))

    count_sql = """
        SELECT COUNT(*) AS total
        FROM VISITORS v
        JOIN STUDENTS s  ON v.student_id = s.student_id
        LEFT JOIN ALLOCATIONS a ON s.student_id = a.student_id AND a.end_date IS NULL
        WHERE s.hall_id = %s
    """
    if not year_filter and not month_filter and not day_filter:
        count_sql += " AND v.entry_time::DATE = CURRENT_DATE"
    else:
        if year_filter:
            count_sql += " AND EXTRACT(YEAR  FROM v.entry_time) = %s"
        if month_filter:
            count_sql += " AND EXTRACT(MONTH FROM v.entry_time) = %s"
        if day_filter:
            count_sql += " AND EXTRACT(DAY   FROM v.entry_time) = %s"

    if room_filter:
        count_sql += " AND a.room_id = %s"

    if search:
        count_sql += " AND (s.name ILIKE %s OR s.student_id LIKE %s)"

    total_count = execute_read_query(count_sql, tuple(count_params))
    total = total_count[0]['total'] if total_count else 0

    return jsonify({
        "data": visitors,
        "pagination": {
            "limit": limit,
            "offset": offset,
            "total": total
        }
    }), 200


@staff_bp.route('/visitors/<string:visitor_id>', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_visitor_detail(visitor_id):
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)

    sql = """
        SELECT
            v.visitor_id,
            v.name            AS visitor_name,
            v.phone_number    AS visitor_phone,
            v.relationship,
            TO_CHAR(v.entry_time, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS entry_time,
            TO_CHAR(v.exit_time,  'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS exit_time,
            s.student_id,
            s.name            AS student_name,
            s.phone_number    AS student_phone,
            s.status          AS student_status,
            a.room_id,
            (s.photo IS NOT NULL) AS student_has_photo
        FROM VISITORS v
        JOIN STUDENTS s  ON v.student_id = s.student_id
        LEFT JOIN ALLOCATIONS a ON s.student_id = a.student_id AND a.end_date IS NULL
        WHERE v.visitor_id = %s
          AND s.hall_id = %s
    """
    result = execute_read_query(sql, (visitor_id, current_hall_id))

    if not result:
        return jsonify({"error": "Visitor not found or unauthorized"}), 404

    return jsonify(result[0]), 200


@staff_bp.route('/visitors/<string:visitor_id>', methods=['DELETE'])
@token_required(allowed_roles=['staff'])
def delete_visitor(visitor_id):
    current_staff_id = request.current_user_id
    current_hall_id = get_current_hall_id(current_staff_id)

    sql = """
        DELETE FROM VISITORS v
        USING STUDENTS s
        WHERE v.student_id = s.student_id
          AND v.visitor_id = %s
          AND s.hall_id    = %s
        RETURNING v.visitor_id
    """
    result = execute_write_query(sql, (visitor_id, current_hall_id))

    if not result:
        return jsonify({"error": "Visitor not found or unauthorized"}), 403

    return jsonify({"message": "Visitor log deleted"}), 200