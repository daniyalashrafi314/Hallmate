from flask import Blueprint, request, jsonify, Response
from app.db import execute_read_query, execute_write_query
from app.email_service import send_welcome_email
from werkzeug.security import generate_password_hash
import re
import secrets
import string

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
#The photo section is missing and needs to be fixed

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
        u.email_address,
        (s.photo IS NOT NULL) AS has_photo
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

@staff_bp.route('/profile/photo', methods=['GET'])
def get_profile_photo():
    sql = """
        SELECT photo
        FROM STAFFS
        WHERE staff_id = %s
        """
    result = execute_read_query(sql, (CURRENT_STAFF_ID,))
    if not result or not result[0].get('photo'):
        return jsonify({"error": "No photo found"}), 404
    return Response(
        result[0]['photo'],
        mimetype='image/jpeg', # You can adjust to 'image/png' if needed, but 'jpeg' is widely compatible
        headers={"Content-Disposition": "inline; filename=profile_photo.jpg"}
    )

@staff_bp.route('/profile', methods=['PUT'])
def edit_profile():
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
        
    staff_update_values.append(CURRENT_STAFF_ID)

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
            WHERE staff_id =%s
        )"""
    execute_write_query(sql2, (email, CURRENT_STAFF_ID))
    sql3 = """
        SELECT role, hall_id
        FROM STAFFS
        WHERE staff_id = %s
        """
    result = execute_read_query(sql3, (CURRENT_STAFF_ID,)) # Added comma for proper tuple
    
    if result:
        # These variables are now safely scoped inside this block
        role = result[0]["role"]
        hall_id = result[0]["hall_id"]

        # Only check the role if we successfully retrieved it
        if role and role.lower() == "provost":
            sql4 = """
            UPDATE HALLS
            SET provost = %s
            WHERE hall_id = %s
            """
            execute_write_query(sql4, (name, hall_id))

    return jsonify({"message": "Profile updated successfully"}), 200

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

# --- SALARY PAGES ---

@staff_bp.route('/salary', methods=['GET'])
def get_paginated_salary():
    
    try:
        limit = min(int(request.args.get('limit', 10)), 50)  # Max 50 per page
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
    salaries = execute_read_query(sql, (CURRENT_STAFF_ID, limit, offset))
    
    # Optionally, you can also return a total count for frontend pagination controls
    count_sql = """
        SELECT COUNT(*) as total
        FROM PAYMENTS p
        JOIN SALARY s ON p.payment_id = s.payment_id
        WHERE s.staff_id = %s
    """
    total_count = execute_read_query(count_sql, (CURRENT_STAFF_ID,))
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
def get_salary_details(payment_id):
   
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
    
    # Pass CURRENT_STAFF_ID to prevent IDOR (Insecure Direct Object Reference)
    salary_detail = execute_read_query(sql, (payment_id, CURRENT_STAFF_ID))

    if not salary_detail:
        return jsonify({"error": "Salary payment not found or unauthorized access"}), 404

    return jsonify(salary_detail[0]), 200

# --- 4) ASK FOR DONATIONS ---
@staff_bp.route('/donations', methods=['GET'])
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
def create_staff_donation_request():
    """
    Staff creating a donation request. 
    Inserts into DONATIONS and links to the staff_id in ASKS_FOR.
    """
    data = request.get_json()
    desc = data.get('description')
    end_date = data.get('endDate')

    if not desc or not end_date:
        return jsonify({"error": "Description and end date are required"}), 400

    # CTE logic: Insert donation first, then use the ID to insert into ASKS_FOR
    sql = """
        WITH new_donation AS (
            INSERT INTO DONATIONS (description, end_date, status) 
            VALUES (%s, %s, 'Pending') 
            RETURNING donation_id
        )
        INSERT INTO ASKS_FOR (donation_id, staff_id, student_id)
        SELECT donation_id, %s, NULL FROM new_donation;
    """
    
    # We pass CURRENT_STAFF_ID as the third parameter
    success = execute_write_query(sql, (desc, end_date, CURRENT_STAFF_ID))
    
    if success:
        return jsonify({"message": "Staff donation request created"}), 201
    return jsonify({"error": "Failed to create donation request"}), 500

@staff_bp.route('/donations/<int:donation_id>', methods=['DELETE'])
def delete_own_donation(donation_id):
    """
    Staff can only delete a donation if they were the one who asked for it
    and if it hasn't been completed/closed yet.
    """
    sql = """
        DELETE FROM DONATIONS 
        WHERE donation_id = %s 
        AND status = 'Pending'
        AND donation_id IN (
            SELECT donation_id FROM ASKS_FOR WHERE staff_id = %s
        )
    """
    success = execute_write_query(sql, (donation_id, CURRENT_STAFF_ID))
    
    if success:
        return jsonify({"message": "Donation request removed"}), 200
    return jsonify({"error": "Unauthorized or donation already processed"}), 403





# --- 6) SEAT APPLICATIONS (Paginated & Details) ---

@staff_bp.route('/seat-applications', methods=['GET'])
def get_paginated_applications():
    try:
        search = request.args.get("search")
        limit = min(int(request.args.get('limit', 10)), 50)
        offset = int(request.args.get('offset', 0))
        status_filter = request.args.get('status', 'Pending') # Default to pending applications
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
    
    params = [CURRENT_HALL_ID, status_filter]

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
def get_application_details(app_id):
    """
    Get all details for a single application, including student info.
    """
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
    app_details = execute_read_query(sql, (app_id, CURRENT_HALL_ID))
    
    if not app_details:
        return jsonify({"error": "Application not found or unauthorized access"}), 404
        
    return jsonify(app_details[0]), 200


@staff_bp.route('/seat-applications/<int:app_id>/priority', methods=['PUT'])
def update_application_priority(app_id):
    """
    Update the priority value of a specific seat application.
    """
    data = request.get_json()
    new_priority = data.get('priority_value')
    
    if new_priority is None:
        return jsonify({"error": "Missing priority_value in request body"}), 400
        
    # Security check: Ensure the application belongs to a student in this staff's hall
    check_sql = """
        SELECT sa.application_id 
        FROM SEAT_APPLICATION sa
        JOIN STUDENTS s ON sa.student_id = s.student_id
        WHERE sa.application_id = %s AND s.hall_id = %s;
    """
    if not execute_read_query(check_sql, (app_id, CURRENT_HALL_ID)):
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
# --- ADD STUDENT ENDPOINT ---
@staff_bp.route('/add-students', methods=['POST'])
def add_student():
    """
    Create a new student, generate their user account, and email them the credentials.
    """
    data = request.get_json()
    student_id = data.get('student_id')
    email_address = data.get('email_address')

    # 1. Basic Validation
    if not student_id or not email_address:
        return jsonify({"error": "Missing student_id or email_address"}), 400

    # Validate student_id is exactly 7 digits using Regex
    if not re.fullmatch(r'^\d{7}$', str(student_id)):
        return jsonify({"error": "Student ID must be exactly 7 digits."}), 400

    # 2. Prepare Data
    user_id = f"{student_id}@buet.ac.bd"
    
    # Generate a secure 10-character random password
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    raw_password = ''.join(secrets.choice(alphabet) for _ in range(10))
    
    # Hash the password before saving to DB (Security Best Practice)
    hashed_password = generate_password_hash(raw_password)

    # 3. Database Insertion (Manual Transaction Simulation)
    
    # First, insert into USERS
    user_sql = """
        INSERT INTO USERS (user_id, email_address, password)
        VALUES (%s, %s, %s)
    """
    user_success = execute_write_query(user_sql, (user_id, email_address, hashed_password))
    
    if not user_success:
        return jsonify({"error": "Failed to create user. ID or Email might already exist."}), 409

    # Second, insert into STUDENTS (Default status: 'ATTACHED' per your ENUM schema)
    student_sql = """
        INSERT INTO STUDENTS (student_id, hall_id, user_id, status)
        VALUES (%s, %s, %s, 'ATTACHED')
    """
    student_success = execute_write_query(student_sql, (student_id, CURRENT_HALL_ID, user_id))

    if not student_success:
        # Rollback: If student insert fails, delete the user we just created so we don't have orphaned data
        execute_write_query("DELETE FROM USERS WHERE user_id = %s", (user_id,))
        return jsonify({"error": "Failed to add student to the hall."}), 500

    # 4. Send the Email
    email_sent = send_welcome_email(email_address, user_id, raw_password)

    # Prepare response
    message = "Student added successfully."
    if not email_sent:
        message += " Warning: Automated email failed to send. Please distribute credentials manually."

    return jsonify({
        "message": message,
        "student_id": student_id,
        "user_id": user_id
    }), 201