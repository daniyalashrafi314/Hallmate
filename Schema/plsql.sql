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





