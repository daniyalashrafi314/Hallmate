from flask import Blueprint, request, jsonify, Response
from app.db import execute_read_query, execute_write_query

# 1. Define the Blueprint
# We define it here so other files (like your main app.py) can import it.
staff_bp = Blueprint('staff', __name__)

# --- MOCK DATA ---
# Hardcoded for development; will be replaced by session logic later.
CURRENT_STAFF_ID = 'STF0000001'
CURRENT_HALL_ID = 1

# --- 1) STAFF PROFILE PAGE ---
#Few issues that will be fixed later, there is a search bar in profile page which is not necessary
#Notification does not work
#Name in the lower section of the sidebar is still not connected to db

@staff_bp.route('/profile', methods=['GET'])
def get_profile():
    # We join STAFFS and USERS to get all details including email
    sql = """
        SELECT 
        s.staff_id,
        s.name AS staff_name,
        s.phone_number,
        s.role,
        s.hall_id,
        h.name AS hall_name,
        h.provost,
        u.email_address
        FROM STAFFS s
        JOIN USERS u ON s.user_id = u.user_id
        JOIN HALLS h ON s.hall_id = h.hall_id
        WHERE s.staff_id = %s
    """
    # We pass a tuple (CURRENT_STAFF_ID,) to safely insert the variable into SQL
    profile = execute_read_query(sql, (CURRENT_STAFF_ID,))
    
    if profile:
        return jsonify(profile[0])
    return jsonify({"error": "Staff not found"}), 404

#----1)For changing the profile info


@staff_bp.route('/profile', methods=['PUT'])
def edit_profile():
    data = request.get_json()
    name = data.get("staff_name")
    phone= data.get("phone_number")
    email = data.get("email_address")

    if not name or not email:
        return jsonify({"error": "Missing fields"}), 400
    sql1 = """
            UPDATE STAFFS
            SET name = %s,
            phone_number = %s
            WHERE staff_id = %s
            """
    execute_write_query(sql1, (name, phone, CURRENT_STAFF_ID))
    sql2 = """
        UPDATE USERS
        SET email_address = %s
        WHERE user_id = (
            SELECT user_id
            FROM STAFFS
            WHERE staff_id =%s
        )"""
    execute_write_query(sql2, (email, CURRENT_STAFF_ID))
    sql3 = """
        SELECT role, hall_id
        FROM STAFFS
        WHERE staff_id = %s
        """
    result = execute_read_query(sql3, (CURRENT_STAFF_ID))
    if result:
        role = result[0]["role"]
        hall_id = result[0]["hall_id"]

    if role.lower() == "provost":
        sql = """
        UPDATE HALLS
        SET provost = %s
        WHERE hall_id = %s
        """
        execute_write_query(sql, (name, hall_id))

    return jsonify({"message": "Profile updated successfully"})

#---2)Profile change password
@staff_bp.route('/change-password', methods=['PUT'])
def change_password():
    data = request.get_json()

    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")
    if not new_password:
        return jsonify({"error": "Password required"}), 400

    if new_password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400
    sql = """
        UPDATE USERS
        SET password = %s
        WHERE user_id = (
            SELECT user_id
            FROM STAFFS
            WHERE staff_id = %s
            )
        """
    execute_write_query(sql, (new_password, CURRENT_STAFF_ID))
    return jsonify({"message": "Password changed successfully"})



# --- 2) NOTICE PAGE (View & Create) ---

@staff_bp.route('/notices', methods=['GET'])
def get_notices():
    
    
    try:
        limit = min(int(request.args.get('limit', 10)), 50)
        offset = int(request.args.get('offset', 0))
    except ValueError:
        return jsonify({"error": "Invalid pagination params"}), 400
    sql = """
        SELECT n.notice_id, n.title, n.description, n.created_at
        FROM NOTICE n
        JOIN STAFFS s ON n.staff_id = s.staff_id
        WHERE s.hall_id = %s
        ORDER BY n.created_at DESC
        LIMIT %s OFFSET %s;
    """
    notices = execute_read_query(sql, (CURRENT_HALL_ID, limit, offset))
    return jsonify({"data": notices}), 200

@staff_bp.route('/notices/<int:notice_id>', methods=['GET'])
def get_notice(notice_id):
    sql = """
        SELECT n.notice_id, n.title, n.description, n.created_at, s.staff_id, s.name, (n.pdf_file IS NOT NULL) AS has_pdf
        FROM NOTICE n
        JOIN STAFFS s ON n.staff_id = s.staff_id
        WHERE n.notice_id = %s
        AND s.hall_id = %s
        
    """
    notice = execute_read_query(sql, (notice_id, CURRENT_HALL_ID))
    if not notice:
        return jsonify({"error": "Not Found"}), 404
    return jsonify(notice[0]),200
@staff_bp.route('/notices/<int:notice_id>/pdf', methods=['GET'])
def get_notice_pdf(notice_id):
    sql = """
        SELECT n.pdf_file
        FROM NOTICE n
        JOIN STAFFS s ON n.staff_id = s.staff_id
        WHERE n.notice_id = %s
        AND s.hall_id = %s
        
        """
    result = execute_read_query(sql, (notice_id, CURRENT_HALL_ID))
    if not result or not result[0].get('pdf_file'):
        return jsonify({"error": "No Pdf"}), 404
    return Response(
        result[0]['pdf_file'],
        mimetype='application/pdf',
        headers={"Content-Disposition": "inline; filename=notice.pdf"}
    )



@staff_bp.route('/notices', methods=['POST'])
def create_notice():
    staff_id = CURRENT_STAFF_ID

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

    values = (staff_id, title, description, pdf_bytes)
    result = execute_write_query(query, values)

    return jsonify({"notice_id": result}), 201
@staff_bp.route('/notices/<int:notice_id>', methods=['DELETE'])
def delete_notice(notice_id):
    
    query = """
        DELETE FROM NOTICE n
        USING STAFFS s
        WHERE n.staff_id = s.staff_id
        AND n.notice_id = %s
        AND s.hall_id = %s
        RETURNING n.notice_id;
    """

    result = execute_write_query(query, (notice_id, CURRENT_HALL_ID))

    if not result:
        return jsonify({"error": "Unauthorized or not found"}), 403

    return jsonify({"message": "Deleted"}), 200

@staff_bp.route('/notices/count', methods=['GET'])
def get_notice_count():
    
    search = request.args.get('search', '')

    query = """
        SELECT COUNT(*) as total
        FROM NOTICE n
        JOIN STAFFS s ON n.staff_id = s.staff_id
        WHERE s.hall_id = %s
        AND (n.title ILIKE %s OR n.description ILIKE %s);
    """

    result = execute_read_query(query, (CURRENT_HALL_ID, f"%{search}%", f"%{search}%"))

    return jsonify(result[0]), 200

# ---3) ADD PAYMENTS (STUDENTS)

@staff_bp.route('/add-payments', methods=['POST'])
def add_payments():
    data = request.get_json()

    student_ids = data.get("student_ids")
    payment_type = data.get("payment_type")
    amount = data.get("amount")
    due_time = data.get("due_time")
    

    if not student_ids or not amount or not due_time or not payment_type:
        return jsonify({"error":"Missing fields"}),400
    
    sql = """
    SELECT student_id
    FROM STUDENTS
    WHERE student_id = ANY(%s)
    AND hall_id = %s
    """
    valid_students = execute_read_query(sql, (student_ids, CURRENT_HALL_ID))
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
        created_count+=1
    return jsonify({
    "message": "Payment notices created successfully",
    "count": created_count
    })
    




@staff_bp.route('/students', methods=['GET'])
def get_students():
    search = request.args.get("search")
    room = request.args.get("room")
    batch = request.args.get("batch")
    sql = """
        SELECT s.student_id, s.name, a.room_id
        FROM STUDENTS s
        LEFT JOIN ALLOCATIONS a ON s.student_id = a.student_id
        WHERE s.hall_id = %s
        """
    params = [CURRENT_HALL_ID]
    if room:
        sql+= " AND a.room_id = %s"
        params.append(room)
    if batch:
        sql+= " AND SUBSTR(s.student_id, 1, 2) = %s"
        params.append(batch)
    if search:
        sql+=" AND (s.name ILIKE %s OR s.student_id LIKE %s)"
        params.append(f"%{search}%")
        params.append(f"%{search}%")

    students = execute_read_query(sql, tuple(params))
    return jsonify(students)

    

@staff_bp.route('/rooms', methods=['GET'])
def get_rooms():
    sql1 = """
        SELECT room_id
        FROM ROOMS
        WHERE hall_id = %s
    """
    rooms = execute_read_query(sql1, (CURRENT_HALL_ID,))
    return jsonify(rooms)

    


@staff_bp.route('/batches', methods=['GET'])
def get_batches():
    sql = """ 
    SELECT DISTINCT SUBSTR(student_id, 1, 2) AS batch
    FROM STUDENTS
    WHERE hall_id = %s
    """
    batches = execute_read_query(sql, (CURRENT_HALL_ID,))
    return jsonify(batches)






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
