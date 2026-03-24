from flask import Blueprint, request, jsonify, send_file
from app.db import execute_read_query, execute_write_query
from datetime import datetime
import random, io

# 1. Define the Blueprint
student_bp = Blueprint('student', __name__)

# In a real app, this comes from the login session.
CURRENT_STUDENT_ID = '2305108'

# --- 1) STUDENT HOME ---

@student_bp.route('/dashboard', methods=['GET'])
def get_student_dashboard():
    # 1. Profile & Allocation Info
    # Uses STUDENTS, HALLS, and ALLOCATIONS tables [cite: 84, 86, 96]
    profile_sql = """
        SELECT s.status, s.name, h.name as hall_name, h.provost, a.room_id, a.seat_number
        FROM STUDENTS s
        JOIN HALLS h ON s.hall_id = h.hall_id
        LEFT JOIN ALLOCATIONS a ON s.student_id = a.student_id AND a.end_date IS NULL
        WHERE s.student_id = %s
    """
    profile_data = execute_read_query(profile_sql, (CURRENT_STUDENT_ID,))
    if not profile_data:
        return jsonify({"error": "Student not found"}), 404

    # 2. Top Due Payment 
    # Uses PAYMENTS and FEES tables, sorting by due_time [cite: 97, 98]
    payment_sql = """
        SELECT p.payment_type as title, p.amount, p.due_time, p.status 
        FROM PAYMENTS p
        JOIN FEES f ON p.payment_id = f.payment_id
        WHERE f.student_id = %s AND p.status IN ('Due', 'Overdue')
        ORDER BY p.due_time ASC LIMIT 1
    """
    payment_data = execute_read_query(payment_sql, (CURRENT_STUDENT_ID,))

    # 3. Top Expected Visitor (Entry time in the future)
    # Uses VISITORS table [cite: 88, 89]
    visitor_sql = """
        SELECT name, entry_time 
        FROM VISITORS 
        WHERE student_id = %s AND entry_time > CURRENT_TIMESTAMP 
        ORDER BY entry_time ASC LIMIT 1
    """
    visitor_data = execute_read_query(visitor_sql, (CURRENT_STUDENT_ID,))

    # 4. Top Notice 
    # Uses NOTICE and STUDENT_NOTICE_STATES tables [cite: 103, 104]
    notice_sql = """
        SELECT n.title, n.created_at, COALESCE(sns.is_read, FALSE) as is_read
        FROM NOTICE n
        LEFT JOIN STUDENT_NOTICE_STATES sns ON n.notice_id = sns.notice_id AND sns.student_id = %s
        WHERE sns.is_hidden IS NOT TRUE
        ORDER BY n.created_at DESC LIMIT 1
    """
    notice_data = execute_read_query(notice_sql, (CURRENT_STUDENT_ID,))

    # 5. Top Approved Donation
    # Uses DONATIONS table [cite: 99]
    donation_sql = """
        SELECT description, start_date 
        FROM DONATIONS 
        WHERE status = 'Approved' 
        ORDER BY start_date DESC LIMIT 1
    """
    donation_data = execute_read_query(donation_sql)

    # 6. Top Complaint
    # Uses COMPLAINTS table [cite: 90, 91]
    complaint_sql = """
        SELECT complaint_type as type, status, date 
        FROM COMPLAINTS 
        WHERE student_id = %s 
        ORDER BY date DESC LIMIT 1
    """
    complaint_data = execute_read_query(complaint_sql, (CURRENT_STUDENT_ID,))

    return jsonify({
        "profile": profile_data[0],
        "payment": payment_data[0] if payment_data else None,
        "visitor": visitor_data[0] if visitor_data else None,
        "notice": notice_data[0] if notice_data else None,
        "donation": donation_data[0] if donation_data else None,
        "complaint": complaint_data[0] if complaint_data else None
    }), 200

# --- 2) PAYMENTS (Fees) ---

@student_bp.route('/payments', methods=['GET'])
def get_payments():
    # Join PAYMENTS and FEES, and use a CASE statement to custom sort the statuses
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
    payments = execute_read_query(sql, (CURRENT_STUDENT_ID,))
    return jsonify(payments if payments else []), 200

@student_bp.route('/payments/<int:payment_id>/pay', methods=['PUT'])
def process_payment(payment_id):
    # Verify the fee actually belongs to the student before marking it as paid
    sql = """
        UPDATE PAYMENTS 
        SET status = 'Paid', paid_at = CURRENT_TIMESTAMP
        WHERE payment_id = %s 
          AND payment_id IN (SELECT payment_id FROM FEES WHERE student_id = %s)
    """
    success = execute_write_query(sql, (payment_id, CURRENT_STUDENT_ID))
    
    if success:
        return jsonify({"message": "Payment successful"}), 200
    return jsonify({"error": "Payment failed or unauthorized"}), 400



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
    notices = execute_read_query(sql, (CURRENT_STUDENT_ID,))
    return jsonify(notices if notices else []), 200

@student_bp.route('/notices/<int:notice_id>/read', methods=['PUT'])
def mark_notice_read(notice_id):
    # UPSERT: Insert the read state. If a row already exists, update it.
    sql = """
        INSERT INTO STUDENT_NOTICE_STATES (student_id, notice_id, is_read)
        VALUES (%s, %s, TRUE)
        ON CONFLICT (student_id, notice_id)
        DO UPDATE SET is_read = TRUE;
    """
    execute_write_query(sql, (CURRENT_STUDENT_ID, notice_id))
    return jsonify({"message": "Marked as read"}), 200

@student_bp.route('/notices/<int:notice_id>/hide', methods=['PUT'])
def hide_notice(notice_id):
    sql = """
        INSERT INTO STUDENT_NOTICE_STATES (student_id, notice_id, is_hidden)
        VALUES (%s, %s, TRUE)
        ON CONFLICT (student_id, notice_id)
        DO UPDATE SET is_hidden = TRUE;
    """
    execute_write_query(sql, (CURRENT_STUDENT_ID, notice_id))
    return jsonify({"message": "Notice hidden"}), 200

@student_bp.route('/notices/<int:notice_id>/pdf', methods=['GET'])
def download_notice_pdf(notice_id):
    sql = "SELECT pdf_file, title FROM NOTICE WHERE notice_id = %s"
    result = execute_read_query(sql, (notice_id,))
    
    if result and result[0]['pdf_file']:
        pdf_data = result[0]['pdf_file']
        title = result[0]['title'].replace(' ', '_')
        # Send the raw byte data back as a downloadable PDF file
        return send_file(
            io.BytesIO(pdf_data),
            download_name=f"{title}.pdf",
            mimetype='application/pdf',
            as_attachment=True
        )
    return jsonify({"error": "PDF not found"}), 404



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

@student_bp.route('/visitors/<visitor_id>/cancel', methods=['DELETE'])
def cancel_visitor(visitor_id):
    sql = """
        DELETE FROM VISITORS 
        WHERE visitor_id = %s AND student_id = %s
    """
    success = execute_write_query(sql, (visitor_id, CURRENT_STUDENT_ID))
    
    if success:
        return jsonify({"message": "Visitor cancelled successfully"}), 200
    return jsonify({"error": "Failed to cancel visitor or unauthorized"}), 400

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

@student_bp.route('/complaints', methods=['GET'])
def get_complaints():
    sql = """
        SELECT complaint_id as id, complaint_type as type, description, 
               status, TO_CHAR(date, 'YYYY-MM-DD') as date, is_anonymous
        FROM COMPLAINTS 
        WHERE student_id = %s 
        ORDER BY complaint_id DESC
    """
    complaints = execute_read_query(sql, (CURRENT_STUDENT_ID,))
    return jsonify(complaints if complaints else []), 200

@student_bp.route('/complaints', methods=['POST'])
def add_complaint():
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
    success = execute_write_query(sql, (CURRENT_STUDENT_ID, c_type, desc, is_anon))
    
    if success:
        return jsonify({"message": "Complaint filed successfully"}), 201
    return jsonify({"error": "Failed to file complaint"}), 500

@student_bp.route('/complaints/<int:complaint_id>', methods=['DELETE'])
def remove_complaint(complaint_id):
    # Only allow deletion if the complaint belongs to the student AND is still 'Pending'
    sql = "DELETE FROM COMPLAINTS WHERE complaint_id = %s AND student_id = %s AND status = 'Pending'"
    success = execute_write_query(sql, (complaint_id, CURRENT_STUDENT_ID))
    
    if success:
        return jsonify({"message": "Complaint removed"}), 200
    return jsonify({"error": "Cannot delete this complaint (it may already be processed)"}), 400



# --- 7) SEAT APPLICATION ---

from flask import request, jsonify

# --- HELPER FUNCTIONS & CONSTANTS ---
DEPARTMENT_CODES = {
    '05': 'Computer Science & Engineering (CSE)',
    '42': 'Electrical & Electronic Engineering (EEE)',
    '01': 'Architecture (ARC)',
    '02': 'Chemical Engineering (CHE)',
    '03': 'Civil Engineering (CIV)',
    '04': 'Mechanical Engineering (MEC)',
    '06': 'Materials & Metallurgical Eng. (MME)',
    '07': 'Naval Arch. & Marine Eng. (NAME)',
    '08': 'Industrial & Production Eng. (IPE)',
    '09': 'Water Resources Engineering (WRE)',
    '10': 'Urban & Regional Planning (URP)',
    '11': 'Biomedical Engineering (BME)'
}

def derive_batch_year(student_id):
    if student_id and len(student_id) >= 2 and student_id[:2].isdigit():
        return f"20{student_id[:2]}"
    return "Unknown"

def derive_department(student_id):
    if student_id and len(student_id) >= 4:
        code = student_id[2:4]
        return DEPARTMENT_CODES.get(code, f"Unknown Code ({code})")
    return "Unknown"

@student_bp.route('/seat-application/status', methods=['GET'])
def get_application_status():
    # 1. Fetch current application status
    app_sql = "SELECT status, description FROM SEAT_APPLICATION WHERE student_id = %s ORDER BY date DESC LIMIT 1"
    application = execute_read_query(app_sql, (CURRENT_STUDENT_ID,))
    
    # 2. Fetch student profile details
    stu_sql = "SELECT name, phone_number FROM STUDENTS WHERE student_id = %s"
    student = execute_read_query(stu_sql, (CURRENT_STUDENT_ID,))
    
    if not student:
        return jsonify({"error": "Student not found"}), 404
        
    stu_data = student[0]
    
    # Bundle the profile with the derived data
    profile = {
        "student_id": CURRENT_STUDENT_ID,
        "name": stu_data['name'],
        "phone": stu_data['phone_number'] or "",
        "batch_year": derive_batch_year(CURRENT_STUDENT_ID),
        "department": derive_department(CURRENT_STUDENT_ID)
    }

    # Determine status (None, Pending, Approved, Refused)
    app_status = application[0]['status'] if application else 'None'
    description = application[0]['description'] if application else ''
    
    return jsonify({
        "status": app_status,
        "reasoning": description,
        "profile": profile
    }), 200

@student_bp.route('/seat-application', methods=['POST'])
def submit_application():
    data = request.get_json()
    reasoning = data.get('reasoning')
    phone = data.get('phone')
    # dept = data.get('department') # Note: No column in DB to save this currently
    
    if not reasoning:
        return jsonify({"error": "Reasoning is required"}), 400

    # Optional: Update the student's phone number if they changed it in the wizard
    if phone:
        execute_write_query("UPDATE STUDENTS SET phone_number = %s WHERE student_id = %s", (phone, CURRENT_STUDENT_ID))
        
    sql = """
        INSERT INTO SEAT_APPLICATION (student_id, description, status) 
        VALUES (%s, %s, 'Pending')
    """
    success = execute_write_query(sql, (CURRENT_STUDENT_ID, reasoning))
    
    if success:
        return jsonify({"message": "Application submitted"}), 201
    return jsonify({"error": "Failed to submit"}), 500

@student_bp.route('/seat-application/cancel', methods=['DELETE'])
def cancel_application():
    # Deletes the application (Used for both Canceling a pending one, or acknowledging a refused one)
    sql = "DELETE FROM SEAT_APPLICATION WHERE student_id = %s AND status IN ('Pending', 'Refused')"
    success = execute_write_query(sql, (CURRENT_STUDENT_ID,))
    
    if success:
        return jsonify({"message": "Application cleared"}), 200
    return jsonify({"error": "Could not clear application"}), 400