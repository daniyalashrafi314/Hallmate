CREATE OR REPLACE PROCEDURE register_new_student(
    p_student_id VARCHAR,
    p_email VARCHAR,
    p_password_hash VARCHAR,
    p_hall_id INT
)

LANGUAGE plpgsql
AS $$
BEGIN
    IF p_password_hash IS NULL OR (
        p_password_hash NOT LIKE 'scrypt:%'
        AND p_password_hash NOT LIKE 'pbkdf2:%'
        AND p_password_hash NOT LIKE 'argon2:%'
        AND p_password_hash NOT LIKE 'sha256:%'
        AND p_password_hash NOT LIKE '$2%'
    ) THEN
        RAISE EXCEPTION 'register_new_student requires a hashed password';
    END IF;

    INSERT INTO USERS (user_id, email_address, password)
    VALUES (p_student_id, p_email, p_password_hash);

    INSERT INTO STUDENTS (student_id, hall_id, user_id, status)
    VALUES (p_student_id, p_hall_id, p_student_id , 'ATTACHED');

END;
$$;


CREATE OR REPLACE FUNCTION get_department_name(p_student_id VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    dept_code VARCHAR;
BEGIN
    -- Extract the 3rd and 4th characters from the student ID
    dept_code := SUBSTRING(p_student_id FROM 3 FOR 2);
    
    RETURN CASE dept_code
        WHEN '05' THEN 'Computer Science & Engineering (CSE)'
        WHEN '42' THEN 'Electrical & Electronic Engineering (EEE)'
        WHEN '01' THEN 'Architecture (ARC)'
	    WHEN '02' THEN 'Chemical Engineering (CHE)'
        WHEN '03' THEN 'Civil Engineering (CIV)'
        WHEN '04' THEN 'Mechanical Engineering (MEC)'
	    WHEN '07' THEN 'Materials & Metallurgical Eng. (MME)'
	    WHEN '06' THEN 'Naval Arch. & Marine Eng. (NAME)'
	    WHEN '08' THEN 'Industrial & Production Eng. (IPE)'
	    WHEN '09' THEN 'Water Resources Engineering (WRE)'
	    WHEN '10' THEN 'Urban & Regional Planning (URP)'
	    WHEN '11' THEN 'Biomedical Engineering (BME)'
        ELSE 'Unknown Department'
    END;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_batch_year(p_student_id VARCHAR)
RETURNS INT AS $$
BEGIN
    RETURN CAST('20' || SUBSTRING(p_student_id FROM 1 FOR 2) AS INT);
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION handle_seat_allocation()
RETURNS TRIGGER AS $$
BEGIN

    IF TG_OP = 'INSERT' THEN
        -- Update Student Status
        UPDATE STUDENTS SET status = 'RESIDENT' WHERE student_id = NEW.student_id;
        -- Update Seat Status
        UPDATE SEATS SET status = 'occupied' WHERE room_id = NEW.room_id AND seat_number = NEW.seat_number;

    ELSIF TG_OP = 'UPDATE' AND NEW.end_date IS NOT NULL AND OLD.end_date IS NULL THEN
        -- Revert Student Status
        UPDATE STUDENTS SET status = 'ATTACHED' WHERE student_id = NEW.student_id;
        -- Revert Seat Status
        UPDATE SEATS SET status = 'vacant' WHERE room_id = NEW.room_id AND seat_number = NEW.seat_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_seat_allocation
AFTER INSERT OR UPDATE ON ALLOCATIONS
FOR EACH ROW
EXECUTE FUNCTION handle_seat_allocation();



-- 3. TRIGGER 1: Notify student when Complaint status changes
CREATE OR REPLACE FUNCTION notify_complaint_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger if the status changed to Resolved or Dismissed
    IF NEW.status IN ('Resolved', 'Dismissed') AND OLD.status != NEW.status THEN
        INSERT INTO NOTIFICATIONS (student_id, title, message, type, target_url)
        VALUES (
            NEW.student_id, 
            'Complaint ' || NEW.status, 
            'Your complaint regarding ' || NEW.complaint_type || ' has been marked as ' || NEW.status || '.', 
            'COMPLAINT', 
            '/student/complaints'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_complaint_update
AFTER UPDATE ON COMPLAINTS
FOR EACH ROW EXECUTE FUNCTION notify_complaint_update();

-- 4. TRIGGER 2: Fan-out notification when a new Event is created
CREATE OR REPLACE FUNCTION notify_new_event()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_public THEN
        -- Insert for EVERY student in the database
        INSERT INTO NOTIFICATIONS (student_id, title, message, type, target_url)
        SELECT student_id, 'New Inter-Hall Event', NEW.name, 'EVENT', '/student/events'
        FROM STUDENTS;
    ELSE
        -- Insert ONLY for students in the same hall
        INSERT INTO NOTIFICATIONS (student_id, title, message, type, target_url)
        SELECT student_id, 'New Hall Event', NEW.name, 'EVENT', '/student/events'
        FROM STUDENTS
        WHERE hall_id = NEW.hall_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_event
AFTER INSERT ON EVENTS
FOR EACH ROW EXECUTE FUNCTION notify_new_event();

-- 5. TRIGGER 3: Fan-out notification when a new Notice is posted
CREATE OR REPLACE FUNCTION notify_new_notice()
RETURNS TRIGGER AS $$
DECLARE
    v_hall_id INT;
BEGIN
    -- Find which hall the staff member who posted the notice belongs to
    SELECT hall_id INTO v_hall_id FROM STAFFS WHERE staff_id = NEW.staff_id;

    IF NEW.is_public THEN
        INSERT INTO NOTIFICATIONS (student_id, title, message, type, target_url)
        SELECT student_id, 'New Public Notice', NEW.title, 'NOTICE', '/student/notices'
        FROM STUDENTS;
    ELSE
        INSERT INTO NOTIFICATIONS (student_id, title, message, type, target_url)
        SELECT student_id, 'New Hall Notice', NEW.title, 'NOTICE', '/student/notices'
        FROM STUDENTS
        WHERE hall_id = v_hall_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_notice
AFTER INSERT ON NOTICE
FOR EACH ROW EXECUTE FUNCTION notify_new_notice();

CREATE OR REPLACE FUNCTION notify_seat_application_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Updated to match your schema's 'Refused'
    IF NEW.status IN ('Approved', 'Refused') AND OLD.status != NEW.status THEN
        INSERT INTO NOTIFICATIONS (student_id, title, message, type, target_url)
        VALUES (
            NEW.student_id, 
            'Seat Application ' || NEW.status::text,
            'Your application for a hall seat has been ' || LOWER(NEW.status::text) || '.',
            'SEAT APPLICATION'::notification_type,
            '/student/profile'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_seat_application_update
AFTER UPDATE ON SEAT_APPLICATION
FOR EACH ROW EXECUTE FUNCTION notify_seat_application_update();

CREATE OR REPLACE FUNCTION notify_donation_approved()
RETURNS TRIGGER AS $$
DECLARE
    v_student_id CHAR(7);
BEGIN
    IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
        -- Find out which student asked for this donation
        SELECT student_id INTO v_student_id FROM ASKS_FOR WHERE donation_id = NEW.donation_id;

        -- Only notify if a student asked for it (ignores staff-requested donations)
        IF v_student_id IS NOT NULL THEN
            INSERT INTO NOTIFICATIONS (student_id, title, message, type, target_url)
            VALUES (
                v_student_id, 
                'Donation Request Approved', 
                'Your donation request has been approved and is now live.', 
                'DONATION', 
                '/student/donations'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_donation_approved
AFTER UPDATE ON DONATIONS
FOR EACH ROW EXECUTE FUNCTION notify_donation_approved();

CREATE OR REPLACE FUNCTION notify_donation_pledge()
RETURNS TRIGGER AS $$
DECLARE
    v_student_id CHAR(7);
    v_staff_id CHAR(10);
    v_amount NUMERIC(12,2);
BEGIN
    -- Find who created the donation (could be student or staff)
    SELECT student_id, staff_id INTO v_student_id, v_staff_id 
    FROM ASKS_FOR WHERE donation_id = NEW.donation_id;
    
    -- Find the amount from the PAYMENTS table
    SELECT amount INTO v_amount FROM PAYMENTS WHERE payment_id = NEW.payment_id;

    -- Notify student if they created the donation
    IF v_student_id IS NOT NULL THEN
        INSERT INTO NOTIFICATIONS (student_id, title, message, type, target_url)
        VALUES (
            v_student_id, 
            'New Donation Pledge!', 
            'Someone has pledged Tk' || v_amount || ' towards your request.', 
            'DONATION', 
            '/student/donations'
        );
    END IF;

    -- Notify staff if they created the donation
    IF v_staff_id IS NOT NULL THEN
        INSERT INTO NOTIFICATIONS (staff_id, title, message, type, target_url)
        VALUES (
            v_staff_id, 
            'New Donation Pledge!', 
            'Someone has pledged Tk' || v_amount || ' towards your request.', 
            'DONATION', 
            '/donations'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_donation_pledge
AFTER INSERT ON GENERATES
FOR EACH ROW EXECUTE FUNCTION notify_donation_pledge();

CREATE OR REPLACE FUNCTION notify_new_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_amount NUMERIC(12,2);
    v_type VARCHAR(20);
    v_due TIMESTAMP;
BEGIN
    -- Fetch the payment details from the PAYMENTS table
    SELECT amount, payment_type, due_time INTO v_amount, v_type, v_due 
    FROM PAYMENTS WHERE payment_id = NEW.payment_id;

    INSERT INTO NOTIFICATIONS (student_id, title, message, type, target_url)
    VALUES (
        NEW.student_id, 
        'New Payment Due', 
        'A new fee of ৳' || v_amount || ' for ' || COALESCE(v_type, 'fees') || ' has been posted. Due by ' || TO_CHAR(v_due, 'YYYY-MM-DD') || '.', 
        'PAYMENT', 
        '/student/payments'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_payment
AFTER INSERT ON FEES
FOR EACH ROW EXECUTE FUNCTION notify_new_payment();

CREATE OR REPLACE FUNCTION notify_overdue_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_student_id CHAR(7);
BEGIN
    IF NEW.status = 'Overdue' AND OLD.status != 'Overdue' THEN
        -- Find the student associated with this payment
        SELECT student_id INTO v_student_id FROM FEES WHERE payment_id = NEW.payment_id;

        IF v_student_id IS NOT NULL THEN
            INSERT INTO NOTIFICATIONS (student_id, title, message, type, target_url)
            VALUES (
                v_student_id, 
                'Payment Overdue Alert', 
                'Your payment of ৳' || NEW.amount || ' for ' || COALESCE(NEW.payment_type, 'fees') || ' is now overdue. Please clear it immediately.', 
                'PAYMENT', 
                '/student/payments'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_overdue_payment
AFTER UPDATE ON PAYMENTS
FOR EACH ROW EXECUTE FUNCTION notify_overdue_payment();


-- TRIGGER 1: Notify staff when assigned a new task
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
    v_task_title VARCHAR(150);
    v_task_priority task_priority;
    v_task_due_date DATE;
BEGIN
    -- Get task details
    SELECT title, priority, due_date 
    INTO v_task_title, v_task_priority, v_task_due_date
    FROM TASKS WHERE task_id = NEW.task_id;

    -- Insert notification for the assigned staff member
    INSERT INTO NOTIFICATIONS (staff_id, title, message, type, target_url)
    VALUES (
        NEW.staff_id,
        'New Task Assigned',
        'You have been assigned a new task: "' || v_task_title || '" with priority: ' || v_task_priority || '.',
        'TASK',
        '/tasks'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_task_assignment
AFTER INSERT ON task_assignments
FOR EACH ROW EXECUTE FUNCTION notify_task_assignment();


-- TRIGGER 2: Notify staff when their donation request is approved
CREATE OR REPLACE FUNCTION notify_staff_donation_approved()
RETURNS TRIGGER AS $$
DECLARE
    v_staff_id CHAR(10);
BEGIN
    IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
        -- Find out which staff member asked for this donation
        SELECT staff_id INTO v_staff_id FROM ASKS_FOR WHERE donation_id = NEW.donation_id;

        -- Only notify if a staff member asked for it
        IF v_staff_id IS NOT NULL THEN
            INSERT INTO NOTIFICATIONS (staff_id, title, message, type, target_url)
            VALUES (
                v_staff_id, 
                'Donation Request Approved', 
                'Your donation request has been approved and is now live.', 
                'DONATION', 
                '/donations'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_staff_donation_approved
AFTER UPDATE ON DONATIONS
FOR EACH ROW EXECUTE FUNCTION notify_staff_donation_approved();



-- TRIGGER 4: Notify all staff when a new event is created in their hall
CREATE OR REPLACE FUNCTION notify_staff_new_event()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_public THEN
        -- Notify ALL staff members (from all halls)
        INSERT INTO NOTIFICATIONS (staff_id, title, message, type, target_url)
        SELECT DISTINCT staff_id, 'New Inter-Hall Event', NEW.name, 'EVENT', '/events'
        FROM STAFFS;
    ELSE
        -- Notify only staff members in the same hall
        INSERT INTO NOTIFICATIONS (staff_id, title, message, type, target_url)
        SELECT DISTINCT staff_id, 'New Hall Event', NEW.name, 'EVENT', '/events'
        FROM STAFFS
        WHERE hall_id = NEW.hall_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_staff_new_event
AFTER INSERT ON EVENTS
FOR EACH ROW EXECUTE FUNCTION notify_staff_new_event();


-- TRIGGER 5: Notify all staff when a new notice is posted in their hall
CREATE OR REPLACE FUNCTION notify_staff_new_notice()
RETURNS TRIGGER AS $$
DECLARE
    v_hall_id INT;
BEGIN
    -- Find which hall the staff member who posted the notice belongs to
    SELECT hall_id INTO v_hall_id FROM STAFFS WHERE staff_id = NEW.staff_id;

    IF NEW.is_public THEN
        -- Notify ALL staff members
        INSERT INTO NOTIFICATIONS (staff_id, title, message, type, target_url)
        SELECT DISTINCT staff_id, 'New Public Notice', NEW.title, 'NOTICE', '/notices'
        FROM STAFFS;
    ELSE
        -- Notify only staff members in the same hall
        INSERT INTO NOTIFICATIONS (staff_id, title, message, type, target_url)
        SELECT DISTINCT staff_id, 'New Hall Notice', NEW.title, 'NOTICE', '/notices'
        FROM STAFFS
        WHERE hall_id = v_hall_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_staff_new_notice
AFTER INSERT ON NOTICE
FOR EACH ROW EXECUTE FUNCTION notify_staff_new_notice();


-- TRIGGER 6: Notify staff when a new salary is posted for them
CREATE OR REPLACE FUNCTION notify_salary_posted()
RETURNS TRIGGER AS $$
DECLARE
    v_amount NUMERIC(12,2);
    v_type VARCHAR(20);
    v_due TIMESTAMP;
BEGIN
    -- Fetch the payment details from the PAYMENTS table
    SELECT amount, payment_type, due_time INTO v_amount, v_type, v_due 
    FROM PAYMENTS WHERE payment_id = NEW.payment_id;

    INSERT INTO NOTIFICATIONS (staff_id, title, message, type, target_url)
    VALUES (
        NEW.staff_id, 
        'New Salary Posted', 
        'Your salary of Tk' || v_amount || ' has been posted. Due by ' || TO_CHAR(v_due, 'YYYY-MM-DD') || '.', 
        'SALARY', 
        '/salary'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_salary_posted
AFTER INSERT ON SALARY
FOR EACH ROW EXECUTE FUNCTION notify_salary_posted();