CREATE TABLE HALLS( --t1
    hall_id SERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL,
    provost VARCHAR(100)
);

CREATE TABLE USERS(     --t2
    user_id       VARCHAR(50) PRIMARY KEY,       
    email_address VARCHAR(50) UNIQUE NOT NULL,
    password      VARCHAR(255)  NOT NULL
);

CREATE TYPE student_status AS ENUM('ATTACHED', 'RESIDENT');

CREATE TABLE STUDENTS --3

(
    student_id    CHAR(7) PRIMARY KEY,  --2305108
    hall_id       INT NOT NULL,
    user_id       VARCHAR(50) NOT NULL,
    name          VARCHAR(100),
    phone_number  VARCHAR(15),
    status        student_status NOT NULL,
    photo         BYTEA,
    FOREIGN KEY (hall_id)
        REFERENCES HALLS(hall_id)
        ON DELETE CASCADE,
    FOREIGN KEY (user_id)
        REFERENCES USERS(user_id)
        
);


CREATE TABLE VISITORS( --4
    visitor_id    VARCHAR(12) PRIMARY KEY,  -- YYYYMMDD-XXX
    student_id    CHAR(7)     NOT NULL,
    name          VARCHAR(100) NOT NULL,
    phone_number  VARCHAR(15) NOT NULL,
    relationship  VARCHAR(20) NOT NULL,
    entry_time    TIMESTAMP NOT NULL,
    exit_time     TIMESTAMP NOT NULL,
    hidden_by_student BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (student_id)
        REFERENCES STUDENTS(student_id)
        ON DELETE CASCADE

    CONSTRAINT check_visitor_times CHECK (entry_time < exit_time)
);

CREATE TYPE c_type AS ENUM('Room', 'Dining', 'Toilet', 'Roommate','Staff', 'Facilities', 'Other'); --complaint on

CREATE TYPE complaint_status AS ENUM('Pending', 'Approved', 'Refused');

CREATE TABLE COMPLAINTS ( --5
    complaint_id   SERIAL PRIMARY KEY,
    student_id     CHAR(7) NOT NULL,
    complaint_type           c_type NOT NULL,        --OR USE AN ENUM
    description    TEXT,
    status         complaint_status DEFAULT 'Pending', --CAN ALSO BE AN ENUM
    date           DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY (student_id) 
        REFERENCES STUDENTS(student_id)
        on DELETE CASCADE 
);
CREATE TYPE application_status AS ENUM ('Pending', 'Approved', 'Refused');


CREATE TABLE SEAT_APPLICATION(  --6

    application_id SERIAL PRIMARY KEY,
    student_id      CHAR(7) NOT NULL,
    description     TEXT,
    date            DATE DEFAULT CURRENT_DATE,
    priority_value  INT,
    status          application_status DEFAULT 'Pending',
    FOREIGN KEY (student_id) 
        REFERENCES STUDENTS(student_id)
        on DELETE CASCADE

);

CREATE TABLE ROOMS(   --7
    room_id     char(3) PRIMARY KEY,
    hall_id     INT NOT NULL,
    capacity    INT,
    FOREIGN KEY (hall_id) 
        REFERENCES HALLS(hall_id)
        on DELETE CASCADE

);

CREATE TYPE seat_status AS ENUM ('vacant', 'occupied');

CREATE TABLE SEATS( --8
            
    seat_number INT NOT NULL,
    room_id CHAR(3) NOT NULL,
    status seat_status DEFAULT 'vacant',
    PRIMARY KEY(room_id,seat_number),                   
    FOREIGN KEY (room_id)
        REFERENCES ROOMS(room_id)
        ON DELETE CASCADE

);

CREATE TABLE ALLOCATIONS(--9
    student_id  char(7) NOT NULL,
    room_id     char(3) NOT NULL,
    seat_number INT NOT NULL,
    start_date  DATE DEFAULT CURRENT_DATE,
    end_date    DATE DEFAULT NULL,
    PRIMARY KEY(student_id, room_id, seat_number),
    FOREIGN KEY(student_id)
        REFERENCES STUDENTS(student_id)
        ON DELETE CASCADE,
    FOREIGN KEY(room_id, seat_number)
        REFERENCES SEATS(room_id, seat_number)
        ON DELETE CASCADE
);
CREATE TYPE staff_role AS ENUM ('Clerk', 'Provost', 'Guard');

CREATE TABLE STAFFS( --10
    staff_id    char(10) PRIMARY KEY,
    hall_id     INT NOT NULL,
    user_id     VARCHAR(50) NOT NULL,
    name        VARCHAR(100),
    phone_number VARCHAR(15),
    role        staff_role,
    salary      INT,
    photo       BYTEA,
    FOREIGN KEY(hall_id)
        REFERENCES HALLS(hall_id)
        ON DELETE CASCADE,
    FOREIGN KEY(user_id)
        REFERENCES USERS(user_id)
    
);


CREATE  TABLE PAYMENTS( --11
    payment_id  SERIAL PRIMARY KEY,
    payment_type        VARCHAR(20),
    amount      NUMERIC(12,2) CHECK (amount >= 0),
    due_time    TIMESTAMP,
    status      payment_status,
    paid_at     TIMESTAMP

);

CREATE TABLE   FEES( --12
    payment_id  INT PRIMARY KEY,
    student_id  CHAR(7)  NOT NULL,
    
    FOREIGN KEY (student_id)
        REFERENCES STUDENTS(student_id)
        ON DELETE CASCADE,
    FOREIGN KEY (payment_id)
        REFERENCES PAYMENTS(payment_id)
        ON DELETE CASCADE

);
CREATE TABLE   SALARY( --13
    payment_id  INT PRIMARY KEY,
    staff_id  CHAR(10)     NOT NULL,
    FOREIGN KEY (staff_id)
        REFERENCES STAFFS(staff_id)
        ON DELETE CASCADE,
    FOREIGN KEY (payment_id)
        REFERENCES PAYMENTS(payment_id)
        ON DELETE CASCADE
);

CREATE TYPE donation_status AS ENUM ('Pending', 'Approved', 'Refused');

CREATE TABLE DONATIONS( --14
    donation_id SERIAL PRIMARY KEY,
    status      donation_status DEFAULT 'Pending',
    description TEXT,
    start_date  DATE DEFAULT CURRENT_DATE,
    end_date    DATE
);

CREATE TABLE GENERATES( --15
    payment_id  INT PRIMARY KEY,
    donation_id INT,
    FOREIGN KEY (payment_id)
        REFERENCES PAYMENTS(payment_id)
        ON DELETE CASCADE,
    FOREIGN KEY (donation_id)
        REFERENCES DONATIONS(donation_id)
);

CREATE TABLE ASKS_FOR(
    donation_id INT NOT NULL,
    student_id CHAR(7),
    staff_id CHAR(10),
    PRIMARY KEY(donation_id),
    FOREIGN KEY(donation_id) REFERENCES DONATIONS(donation_id) ON DELETE CASCADE,
    FOREIGN KEY(student_id) REFERENCES STUDENTS(student_id),
    FOREIGN KEY(staff_id) REFERENCES STAFFS(staff_id)

    CONSTRAINT at_least_one_requester CHECK (
        (student_id IS NOT NULL) OR (staff_id IS NOT NULL)
    )
);





CREATE TABLE EVENTS( --17
    event_id    SERIAL PRIMARY KEY,
    name        VARCHAR(50),
    description TEXT,
    date        DATE,
    hall_id     INT,
    FOREIGN KEY(hall_id)
        REFERENCES HALLS(hall_id)
        ON DELETE CASCADE
);

CREATE TABLE NOTICE ( --18
    notice_id    SERIAL PRIMARY KEY,
    staff_id     CHAR(10) NOT NULL REFERENCES STAFFS(staff_id),
    title        VARCHAR(150),
    description  TEXT,
    pdf_file     BYTEA,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE STUDENT_NOTICE_STATES (
    student_id CHAR(7) REFERENCES STUDENTS(student_id) ON DELETE CASCADE,
    notice_id  INT     REFERENCES NOTICE(notice_id) ON DELETE CASCADE,
    is_read    BOOLEAN DEFAULT FALSE,
    is_hidden  BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (student_id, notice_id)
);

CREATE OR REPLACE PROCEDURE register_new_student(
    p_student_id VARCHAR,
    p_email VARCHAR,
    p_password VARCHAR,
    p_hall_id INT
)

LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO USERS (user_id, email_address, password)
    VALUES (p_student_id, p_email, p_password);

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





