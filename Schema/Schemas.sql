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
    name          VARCHAR(100),
    phone_number  VARCHAR(15),
    relationship  VARCHAR(20),
    entry_time    TIMESTAMP,
    exit_time     TIMESTAMP,
    FOREIGN KEY (student_id)
        REFERENCES STUDENTS(student_id)
        ON DELETE CASCADE
);

CREATE TYPE c_type AS ENUM('Students', 'Staffs', 'Food', 'Facilities','Others'); --complaint on

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

CREATE TABLE SEATS( --8
            
    seat_number INT NOT NULL,
    room_id CHAR(3) NOT NULL,
    status VARCHAR(20),
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
CREATE TYPE payment_status AS ENUM ('Due', 'Paid', 'Overdue');

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
    FOREIGN KEY(donation_id) REFERENCES DONATIONS(donation_id),
    FOREIGN KEY(student_id) REFERENCES STUDENTS(student_id),
    FOREIGN KEY(staff_id) REFERENCES STAFFS(staff_id)
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









