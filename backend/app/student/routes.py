from flask import Blueprint, request, jsonify, Response, send_file
from app.db import execute_read_query, execute_write_query
from datetime import date, datetime
import random, io
from app.auth.middleware import token_required
from app.security.passwords import hash_password, verify_password

# 1. Define the Blueprint
student_bp = Blueprint('student', __name__)

# --- STUDENT PROFILE ---
@student_bp.route('/profile', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_student_profile():
    current_student_id = request.current_user_id

    sql = """
        SELECT
            s.student_id,
            s.name,
            s.phone_number,
            COALESCE(get_department_name(s.student_id), '') AS department,
            COALESCE(get_batch_year(s.student_id)::text, '') AS batch_year,
            h.name AS hall_name,
            u.email_address,
            (s.photo IS NOT NULL) AS has_photo,
            (COALESCE(s.name, '') = '' OR COALESCE(s.phone_number, '') = '') AS needs_profile_completion,
            COALESCE(a.room_id, '') AS room_id,
            COALESCE(a.seat_number::text, '') AS seat_number
        FROM STUDENTS s
        JOIN USERS u ON s.user_id = u.user_id
        LEFT JOIN HALLS h ON s.hall_id = h.hall_id
        LEFT JOIN ALLOCATIONS a ON s.student_id = a.student_id AND a.end_date IS NULL
        WHERE s.student_id = %s
    """
    result = execute_read_query(sql, (current_student_id,))
    if not result:
        return jsonify({'error': 'Student not found'}), 404
    return jsonify(result[0])


@student_bp.route('/profile/photo', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_student_profile_photo():
    current_student_id = request.current_user_id
    sql = "SELECT photo FROM STUDENTS WHERE student_id = %s"
    result = execute_read_query(sql, (current_student_id,))

    if not result or not result[0].get('photo'):
        return jsonify({'error': 'No photo found'}), 404

    return Response(
        result[0]['photo'],
        mimetype='image/jpeg',
        headers={'Content-Disposition': 'inline; filename=student_photo.jpg'}
    )


@student_bp.route('/profile', methods=['PUT'])
@token_required(allowed_roles=['student'])
def update_student_profile():
    current_student_id = request.current_user_id

    if request.content_type and request.content_type.startswith('multipart/form-data'):
        name = request.form.get('name')
        phone_number = request.form.get('phone_number')
        photo_file = request.files.get('photo')
    else:
        data = request.get_json() or {}
        name = data.get('name')
        phone_number = data.get('phone_number')
        photo_file = None

    if not name or not name.strip() or not phone_number or not phone_number.strip():
        return jsonify({'error': 'name and phone_number are required'}), 400

    update_clauses = ['name = %s', 'phone_number = %s']
    update_values = [name.strip(), phone_number.strip()]

    if photo_file:
        photo_bytes = photo_file.read()
        update_clauses.append('photo = %s')
        update_values.append(photo_bytes)

    update_values.append(current_student_id)
    sql = f"UPDATE STUDENTS SET {', '.join(update_clauses)} WHERE student_id = %s"
    execute_write_query(sql, tuple(update_values))

    return jsonify({'message': 'Profile updated successfully'})


@student_bp.route('/verify-password', methods=['POST'])
@token_required(allowed_roles=['student'])
def verify_old_password():
    current_student_id = request.current_user_id
    data = request.get_json() or {}
    old_password = data.get('old_password')

    if not old_password:
        return jsonify({'error': 'Password is required'}), 400

    sql = """
        SELECT u.password
        FROM USERS u
        JOIN STUDENTS s ON s.user_id = u.user_id
        WHERE s.student_id = %s
    """
    result = execute_read_query(sql, (current_student_id,))
    if not result or not verify_password(result[0]['password'], old_password):
        return jsonify({'error': 'Current password incorrect'}), 401

    return jsonify({'message': 'Password verified'}), 200


@student_bp.route('/change-password', methods=['PUT'])
@token_required(allowed_roles=['student'])
def change_student_password():
    current_student_id = request.current_user_id
    data = request.get_json() or {}
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    confirm_password = data.get('confirm_password')

    if not old_password or not new_password or not confirm_password:
        return jsonify({'error': 'Old and new password are required'}), 400

    if new_password != confirm_password:
        return jsonify({'error': 'Passwords do not match'}), 400

    sql = """
        SELECT u.password
        FROM USERS u
        JOIN STUDENTS s ON s.user_id = u.user_id
        WHERE s.student_id = %s
    """
    result = execute_read_query(sql, (current_student_id,))
    if not result or not verify_password(result[0]['password'], old_password):
        return jsonify({'error': 'Current password incorrect'}), 401

    hashed = hash_password(new_password)
    sql2 = """
        UPDATE USERS
        SET password = %s
        WHERE user_id = (
            SELECT user_id FROM STUDENTS WHERE student_id = %s
        )
    """
    execute_write_query(sql2, (hashed, current_student_id))

    return jsonify({'message': 'Password changed successfully'})


# --- 1) STUDENT HOME ---

@student_bp.route('/dashboard', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_student_dashboard():
    current_student_id = request.current_user_id

    # 1. Profile & Allocation Info
    profile_sql = """
        SELECT s.status, s.name, h.name as hall_name, h.provost, a.room_id, a.seat_number
        FROM STUDENTS s
        JOIN HALLS h ON s.hall_id = h.hall_id
        LEFT JOIN ALLOCATIONS a ON s.student_id = a.student_id AND a.end_date IS NULL
        WHERE s.student_id = %s
    """
    profile_data = execute_read_query(profile_sql, (current_student_id,))
    if not profile_data:
        return jsonify({"error": "Student not found"}), 404

    # 2. Top Due Payment 
    payment_sql = """
        SELECT p.payment_type as title, p.amount, p.due_time, p.status 
        FROM PAYMENTS p
        JOIN FEES f ON p.payment_id = f.payment_id
        WHERE f.student_id = %s AND p.status IN ('Due', 'Overdue')
        ORDER BY p.due_time ASC LIMIT 1
    """
    payment_data = execute_read_query(payment_sql, (current_student_id,))

    # 3. Top Expected Visitor (Entry time in the future)
    visitor_sql = """
        SELECT name, entry_time 
        FROM VISITORS 
        WHERE student_id = %s AND entry_time > CURRENT_TIMESTAMP 
        ORDER BY entry_time ASC LIMIT 1
    """
    visitor_data = execute_read_query(visitor_sql, (current_student_id,))

    # 4. Top Notice 
    notice_sql = """
        SELECT n.title, n.created_at, COALESCE(sns.is_read, FALSE) as is_read
        FROM NOTICE n
        LEFT JOIN STUDENT_NOTICE_STATES sns ON n.notice_id = sns.notice_id AND sns.student_id = %s
        WHERE sns.is_hidden IS NOT TRUE
        ORDER BY n.created_at DESC LIMIT 1
    """
    notice_data = execute_read_query(notice_sql, (current_student_id,))

    # 5. Top Approved Donation
    donation_sql = """
        SELECT description, start_date 
        FROM DONATIONS 
        WHERE status = 'Approved' 
        ORDER BY start_date DESC LIMIT 1
    """
    donation_data = execute_read_query(donation_sql)

    # 6. Top Complaint
    complaint_sql = """
        SELECT complaint_type as type, status, date 
        FROM COMPLAINTS 
        WHERE student_id = %s 
        ORDER BY date DESC LIMIT 1
    """
    complaint_data = execute_read_query(complaint_sql, (current_student_id,))

    return jsonify({
        "profile": profile_data[0],
        "payment": payment_data[0] if payment_data else None,
        "visitor": visitor_data[0] if visitor_data else None,
        "notice": notice_data[0] if notice_data else None,
        "donation": donation_data[0] if donation_data else None,
        "complaint": complaint_data[0] if complaint_data else None
    }), 200

@student_bp.route('/status', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_student_status():
    current_student_id = request.current_user_id
    sql = "SELECT status FROM STUDENTS WHERE student_id = %s"
    result = execute_read_query(sql, (current_student_id,))
    if result:
        return jsonify({"status": result[0]['status']}), 200
    return jsonify({"error": "Student not found"}), 404

# --- 2) PAYMENTS (Fees) ---

@student_bp.route('/payments', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_payments():
    current_student_id = request.current_user_id
    sql = """
        SELECT 
            p.payment_id as id, 
            p.payment_type as title, 
            p.amount, 
            TO_CHAR(p.due_time, 'YYYY-MM-DD"T"HH24:MI:SS') as "dueDate",
            p.status,
            TO_CHAR(p.paid_at, 'YYYY-MM-DD"T"HH24:MI:SS') as "paidAt"
        FROM PAYMENTS p
        JOIN FEES f ON p.payment_id = f.payment_id
        WHERE f.student_id = %s
        ORDER BY 
            CASE p.status
                WHEN 'Overdue' THEN 1
                WHEN 'Due' THEN 2
                WHEN 'Paid' THEN 3
                ELSE 4
            END,
            p.due_time ASC;
    """
    payments = execute_read_query(sql, (current_student_id,))
    return jsonify(payments if payments else []), 200

@student_bp.route('/payments/<int:payment_id>/pay', methods=['PUT'])
@token_required(allowed_roles=['student'])
def process_payment(payment_id):
    current_student_id = request.current_user_id
    sql = """
        UPDATE PAYMENTS 
        SET status = 'Paid', paid_at = CURRENT_TIMESTAMP
        WHERE payment_id = %s 
          AND payment_id IN (SELECT payment_id FROM FEES WHERE student_id = %s)
    """
    success = execute_write_query(sql, (payment_id, current_student_id))
    
    if success:
        return jsonify({"message": "Payment successful"}), 200
    return jsonify({"error": "Payment failed or unauthorized"}), 400

# --- 3) DONATIONS ---

@student_bp.route('/donations', methods=['GET'])
@token_required(allowed_roles=['student'])
def list_donations():
    current_student_id = request.current_user_id
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
          AND NOT (COALESCE(st.student_id, sf.staff_id) = %s AND d.status = 'Approved')
        ORDER BY d.start_date DESC
    """
    donations = execute_read_query(sql, (current_student_id,))
    return jsonify(donations)

@student_bp.route('/donations', methods=['POST'])
@token_required(allowed_roles=['student'])
def create_donation():
    current_student_id = request.current_user_id
    data = request.get_json()
    desc = data.get('description')
    end_date = data.get('endDate')
    
    try:
        # Assuming the frontend sends 'YYYY-MM-DD'
        end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
        
        # 2. Enforce the Future Date constraint
        if end_date <= date.today():
            return jsonify({"error": "Set a future date."}), 400
            
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    sql = """
        WITH new_donation AS (
            INSERT INTO DONATIONS (description, end_date) 
            VALUES (%s, %s) 
            RETURNING donation_id
        )
        INSERT INTO ASKS_FOR (donation_id, student_id)
        SELECT donation_id, %s FROM new_donation;
    """
    success = execute_write_query(sql, (desc, end_date, current_student_id))
    
    if success:
        return jsonify({"message": "Donation request submitted"}), 201
    return jsonify({"error": "Failed to create request"}), 500

@student_bp.route('/donations/<int:donation_id>', methods=['DELETE'])
@token_required(allowed_roles=['student'])
def withdraw_donation(donation_id):
    current_student_id = request.current_user_id
    sql = """
        DELETE FROM DONATIONS 
        WHERE donation_id = %s 
        AND status = 'Pending'
        AND donation_id IN (
            SELECT donation_id FROM ASKS_FOR WHERE student_id = %s
        )
    """
    success = execute_write_query(sql, (donation_id, current_student_id))
    if success:
        return jsonify({"message": "Donation request withdrawn"}), 200
    return jsonify({"error": "Cannot delete this donation"}), 403

@student_bp.route('/donations/<int:donation_id>/pledge', methods=['POST'])
@token_required(allowed_roles=['student'])
def pledge_donation(donation_id):
    current_student_id = request.current_user_id
    data = request.get_json()
    amount = data.get('pledgeAmount')
    
    if not amount or float(amount) <= 0:
         return jsonify({"error": "Invalid amount"}), 400

    sql_pay = """
        INSERT INTO PAYMENTS (payment_type, amount, due_time, status) 
        VALUES ('Donation', %s, CURRENT_TIMESTAMP, 'Due') 
        RETURNING payment_id
    """
    res = execute_read_query(sql_pay, (amount,))
    
    if res:
        new_pay_id = res[0]['payment_id']
        sql_gen = "INSERT INTO GENERATES (payment_id, donation_id) VALUES (%s, %s)"
        execute_write_query(sql_gen, (new_pay_id, donation_id))
        
        sql_fee = "INSERT INTO FEES (payment_id, student_id) VALUES (%s, %s)"
        execute_write_query(sql_fee, (new_pay_id, current_student_id))
        
        return jsonify({"message": "Pledge recorded as a due payment."}), 201
        
    return jsonify({"error": "Pledge failed"}), 500

# --- 4) NOTICES ---

@student_bp.route('/notices', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_notices():
    current_student_id = request.current_user_id
    sql = """
        SELECT 
            n.notice_id as id, 
            s.name as author, 
            n.title, 
            n.description,
            TO_CHAR(n.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') as date,
            (n.pdf_file IS NOT NULL) as "hasAttachment",
            COALESCE(sns.is_read, FALSE) as is_read
        FROM NOTICE n
        JOIN STAFFS s ON n.staff_id = s.staff_id
        LEFT JOIN STUDENT_NOTICE_STATES sns 
            ON n.notice_id = sns.notice_id AND sns.student_id = %s
        WHERE sns.is_hidden IS NOT TRUE
        ORDER BY n.created_at DESC;
    """
    notices = execute_read_query(sql, (current_student_id,))
    return jsonify(notices if notices else []), 200

@student_bp.route('/notices/<int:notice_id>/read', methods=['PUT'])
@token_required(allowed_roles=['student'])
def mark_notice_read(notice_id):
    current_student_id = request.current_user_id
    sql = """
        INSERT INTO STUDENT_NOTICE_STATES (student_id, notice_id, is_read)
        VALUES (%s, %s, TRUE)
        ON CONFLICT (student_id, notice_id)
        DO UPDATE SET is_read = TRUE;
    """
    execute_write_query(sql, (current_student_id, notice_id))
    return jsonify({"message": "Marked as read"}), 200

@student_bp.route('/notices/<int:notice_id>/hide', methods=['PUT'])
@token_required(allowed_roles=['student'])
def hide_notice(notice_id):
    current_student_id = request.current_user_id
    sql = """
        INSERT INTO STUDENT_NOTICE_STATES (student_id, notice_id, is_hidden)
        VALUES (%s, %s, TRUE)
        ON CONFLICT (student_id, notice_id)
        DO UPDATE SET is_hidden = TRUE;
    """
    execute_write_query(sql, (current_student_id, notice_id))
    return jsonify({"message": "Notice hidden"}), 200

@student_bp.route('/notices/<int:notice_id>/pdf', methods=['GET'])
@token_required(allowed_roles=['student'])
def download_notice_pdf(notice_id):
    sql = "SELECT pdf_file, title FROM NOTICE WHERE notice_id = %s"
    result = execute_read_query(sql, (notice_id,))
    
    if result and result[0]['pdf_file']:
        pdf_data = result[0]['pdf_file']
        title = result[0]['title'].replace(' ', '_')
        return send_file(
            io.BytesIO(pdf_data),
            download_name=f"{title}.pdf",
            mimetype='application/pdf',
            as_attachment=True
        )
    return jsonify({"error": "PDF not found"}), 404

# --- 5) VISITORS ---

@student_bp.route('/visitors', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_visitors():
    current_student_id = request.current_user_id
    sql = """
        SELECT visitor_id as id, name, phone_number as phone, relationship, 
               TO_CHAR(entry_time, 'YYYY-MM-DD HH12:MI AM') as entry_time,
               TO_CHAR(exit_time, 'YYYY-MM-DD HH12:MI AM') as exit_time,
               entry_time as raw_entry
        FROM VISITORS 
        WHERE student_id = %s AND hidden_by_student = FALSE
        ORDER BY raw_entry DESC
    """
    visitors = execute_read_query(sql, (current_student_id,))
    return jsonify(visitors if visitors else []), 200

@student_bp.route('/visitors', methods=['POST'])
@token_required(allowed_roles=['student'])
def add_visitor():
    current_student_id = request.current_user_id
    data = request.get_json()
    
    required_fields = ['name', 'phone', 'relationship', 'entry_time', 'exit_time']
    for field in required_fields:
        if not data.get(field) or str(data.get(field)).strip() == "":
            return jsonify({"error": f"Field '{field}' is required"}), 400
    
    # Check if student is resident
    student_sql = "SELECT status FROM STUDENTS WHERE student_id = %s"
    student = execute_read_query(student_sql, (current_student_id,))
    if not student or student[0]['status'] != 'RESIDENT':
        return jsonify({"error": "Only resident students can add visitors"}), 403
    
    # Parse times
    try:
        entry_time = datetime.fromisoformat(data['entry_time'].replace('Z', '+00:00'))
        exit_time = datetime.fromisoformat(data['exit_time'].replace('Z', '+00:00'))
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400
    
    if entry_time >= exit_time:
        return jsonify({"error": "Entry time must be before exit time"}), 400
    
    if exit_time <= datetime.now():
        return jsonify({"error": "You cannot enter a visit in the past"}), 400
    
    if (exit_time - entry_time).total_seconds() > 4 * 3600:
        return jsonify({"error": "Visit duration cannot exceed 4 hours"}), 400
    
    if not (6 <= entry_time.hour <= 21 and 6 <= exit_time.hour <= 21):
        return jsonify({"error": "Visits are only allowed between 6 AM and 10 PM"}), 400
    
    date_str = datetime.now().strftime('%Y%m%d')
    random_suffix = str(random.randint(100, 999))
    visitor_id = f"{date_str}-{random_suffix}"
    
    phone = data.get('phone')
    sql = """
        INSERT INTO VISITORS (visitor_id, student_id, name, phone_number, relationship, entry_time, exit_time)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
    """
    
    success = execute_write_query(sql, (
        visitor_id, 
        current_student_id, 
        data.get('name'), 
        phone, 
        data.get('relationship'), 
        entry_time, 
        exit_time
    ))
    
    if success:
        return jsonify({"message": "Visitor expected", "id": visitor_id}), 201
        
    return jsonify({"error": "Failed to add visitor"}), 400

@student_bp.route('/visitors/<visitor_id>/cancel', methods=['DELETE'])
@token_required(allowed_roles=['student'])
def cancel_visitor(visitor_id):
    current_student_id = request.current_user_id
    sql = """
        DELETE FROM VISITORS 
        WHERE visitor_id = %s AND student_id = %s
    """
    success = execute_write_query(sql, (visitor_id, current_student_id))
    
    if success:
        return jsonify({"message": "Visitor cancelled successfully"}), 200
    return jsonify({"error": "Failed to cancel visitor or unauthorized"}), 400

@student_bp.route('/visitors/<visitor_id>/hide', methods=['PUT'])
@token_required(allowed_roles=['student'])
def hide_visitor(visitor_id):
    current_student_id = request.current_user_id
    sql = "UPDATE VISITORS SET hidden_by_student = TRUE WHERE visitor_id = %s AND student_id = %s"
    execute_write_query(sql, (visitor_id, current_student_id))
    return jsonify({"message": "Visitor hidden from log"}), 200

@student_bp.route('/visitors/clear', methods=['PUT'])
@token_required(allowed_roles=['student'])
def clear_visitors():
    current_student_id = request.current_user_id
    sql = "UPDATE VISITORS SET hidden_by_student = TRUE WHERE student_id = %s"
    execute_write_query(sql, (current_student_id,))
    return jsonify({"message": "Visitor log cleared"}), 200

# --- 6) COMPLAINTS ---

@student_bp.route('/complaints', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_complaints():
    current_student_id = request.current_user_id
    sql = """
        SELECT complaint_id as id, complaint_type as type, description, 
               status, TO_CHAR(date, 'YYYY-MM-DD') as date, is_anonymous
        FROM COMPLAINTS 
        WHERE student_id = %s 
        ORDER BY complaint_id DESC
    """
    complaints = execute_read_query(sql, (current_student_id,))
    return jsonify(complaints if complaints else []), 200

@student_bp.route('/complaints', methods=['POST'])
@token_required(allowed_roles=['student'])
def add_complaint():
    current_student_id = request.current_user_id
    data = request.get_json()
    c_type = data.get('type')
    desc = data.get('description')
    is_anon = data.get('is_anonymous', False)
    
    if not c_type or not desc:
        return jsonify({"error": "Type and description are required"}), 400
        
    sql = """
        INSERT INTO COMPLAINTS (student_id, complaint_type, description, is_anonymous) 
        VALUES (%s, %s, %s, %s)
    """
    success = execute_write_query(sql, (current_student_id, c_type, desc, is_anon))
    
    if success:
        return jsonify({"message": "Complaint filed successfully"}), 201
    return jsonify({"error": "Failed to file complaint"}), 500

@student_bp.route('/complaints/<int:complaint_id>', methods=['DELETE'])
@token_required(allowed_roles=['student'])
def remove_complaint(complaint_id):
    current_student_id = request.current_user_id
    sql = "DELETE FROM COMPLAINTS WHERE complaint_id = %s AND student_id = %s AND status = 'Pending'"
    success = execute_write_query(sql, (complaint_id, current_student_id))
    
    if success:
        return jsonify({"message": "Complaint removed"}), 200
    return jsonify({"error": "Cannot delete this complaint (it may already be processed)"}), 400



# --- 7) SEAT APPLICATION ---

@student_bp.route('/seat-application/status', methods=['GET'])
@token_required(allowed_roles=['student'])
def get_application_status():
    current_student_id = request.current_user_id

    app_sql = "SELECT status, description FROM SEAT_APPLICATION WHERE student_id = %s ORDER BY date DESC LIMIT 1"
    application = execute_read_query(app_sql, (current_student_id,))
    
    stu_sql = """
                SELECT name, phone_number, get_department_name(student_id) as department, get_batch_year(student_id) as batch_year
                FROM STUDENTS 
                WHERE student_id = %s
            """
    
    student = execute_read_query(stu_sql, (current_student_id,))
    
    if not student:
        return jsonify({"error": "Student not found"}), 404
        
    stu_data = student[0]
    
    profile = {
        "student_id": current_student_id,
        "name": stu_data['name'],
        "department": stu_data['department'],
        "batch_year": stu_data['batch_year'],
        "phone": stu_data['phone_number'] or ""
    }

    app_status = application[0]['status'] if application else 'None'
    description = application[0]['description'] if application else ''
    
    return jsonify({
        "status": app_status,
        "reasoning": description,
        "profile": profile
    }), 200

@student_bp.route('/seat-application', methods=['POST'])
@token_required(allowed_roles=['student'])
def submit_application():
    current_student_id = request.current_user_id
    data = request.get_json()
    reasoning = data.get('reasoning')
    phone = data.get('phone')
    
    if not reasoning:
        return jsonify({"error": "Reasoning is required"}), 400

    if phone:
        execute_write_query("UPDATE STUDENTS SET phone_number = %s WHERE student_id = %s", (phone, current_student_id))
        
    sql = """
        INSERT INTO SEAT_APPLICATION (student_id, description, status) 
        VALUES (%s, %s, 'Pending')
    """
    success = execute_write_query(sql, (current_student_id, reasoning))
    
    if success:
        return jsonify({"message": "Application submitted"}), 201
    return jsonify({"error": "Failed to submit"}), 500

@student_bp.route('/seat-application/cancel', methods=['DELETE'])
@token_required(allowed_roles=['student'])
def cancel_application():
    current_student_id = request.current_user_id
    sql = "DELETE FROM SEAT_APPLICATION WHERE student_id = %s AND status IN ('Pending', 'Refused')"
    success = execute_write_query(sql, (current_student_id,))
    
    if success:
        return jsonify({"message": "Application cleared"}), 200
    return jsonify({"error": "Could not clear application"}), 400