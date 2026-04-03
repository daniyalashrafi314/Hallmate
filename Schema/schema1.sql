-- ============================================================
-- NOTE: HALLS and STAFFS have a circular FK dependency.
-- Solution: Create HALLS first (without provost_id FK),
-- then STAFFS, then add the FK via ALTER TABLE below.
-- Everything else is unchanged — only the order is fixed.
-- ============================================================


-- 1. USERS (no dependencies)
CREATE TABLE USERS(     --t2
    user_id       VARCHAR(50) PRIMARY KEY,       
    email_address VARCHAR(50) UNIQUE NOT NULL,
    password      VARCHAR(255)  NOT NULL
);


-- 2. HALLS (provost_id FK added via ALTER TABLE after STAFFS is created)
CREATE TABLE HALLS( --t1
    hall_id SERIAL PRIMARY KEY,
    name    VARCHAR(100) NOT NULL,
    provost_id CHAR(10)   -- FK to STAFFS added below via ALTER TABLE
);


-- 3. STAFFS (depends on HALLS, USERS)
CREATE TYPE staff_role AS ENUM ('Staff', 'Provost');

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
        REFERENCES USERS(user_id) ON DELETE CASCADE
    
);


-- 4. Now that STAFFS exists, add the provost_id FK to HALLS
ALTER TABLE HALLS
    ADD CONSTRAINT fk_halls_provost
    FOREIGN KEY (provost_id) REFERENCES STAFFS(staff_id) ON DELETE SET NULL;


-- 5. STUDENTS (depends on HALLS, USERS)
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
        REFERENCES USERS(user_id) ON DELETE CASCADE
        
);


-- 6. VISITORS (depends on STUDENTS)
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
        ON DELETE CASCADE,

    CONSTRAINT check_visitor_times CHECK (entry_time < exit_time),
    CONSTRAINT check_no_past_visits CHECK (exit_time > CURRENT_TIMESTAMP),
    CONSTRAINT check_visit_duration CHECK (exit_time - entry_time <= INTERVAL '4 hours'),
    CONSTRAINT check_visit_hours CHECK (EXTRACT(HOUR FROM entry_time) BETWEEN 6 AND 21 AND EXTRACT(HOUR FROM exit_time) BETWEEN 6 AND 21)
);


-- 7. COMPLAINTS (depends on STUDENTS)
CREATE TYPE c_type AS ENUM('Room', 'Dining', 'Toilet', 'Roommate','Staff', 'Facilities', 'Other'); --complaint on

CREATE TYPE complaint_status AS ENUM('Pending', 'Resolved', 'Dismissed');

CREATE TABLE COMPLAINTS ( --5
    complaint_id   SERIAL PRIMARY KEY,
    student_id     CHAR(7) NOT NULL,
    complaint_type           c_type NOT NULL,        --OR USE AN ENUM
    description    TEXT,
    status         complaint_status DEFAULT 'Pending', --CAN ALSO BE AN ENUM
    is_anonymous   BOOLEAN DEFAULT FALSE,
    is_public      BOOLEAN DEFAULT FALSE,
    date           DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY (student_id) 
        REFERENCES STUDENTS(student_id)
        on DELETE CASCADE 
);


-- 8. COMPLAINT_UPVOTES (depends on COMPLAINTS, STUDENTS)
CREATE TABLE COMPLAINT_UPVOTES (
    complaint_id INT REFERENCES COMPLAINTS(complaint_id) ON DELETE CASCADE,
    student_id VARCHAR(50) REFERENCES STUDENTS(student_id) ON DELETE CASCADE,
    PRIMARY KEY (complaint_id, student_id)
);


-- 9. SEAT_APPLICATION (depends on STUDENTS)
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


-- 10. ROOMS (depends on HALLS)
CREATE TABLE ROOMS(   --7
    room_id     char(3) PRIMARY KEY,
    hall_id     INT NOT NULL,
    capacity    INT,
    FOREIGN KEY (hall_id) 
        REFERENCES HALLS(hall_id)
        on DELETE CASCADE
);


-- 11. SEATS (depends on ROOMS)
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


-- 12. ALLOCATIONS (depends on STUDENTS, SEATS)
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


-- 13. PAYMENTS (no dependencies)
CREATE TYPE payment_status AS ENUM ('Due', 'Paid', 'Overdue');

CREATE  TABLE PAYMENTS( --11
    payment_id  SERIAL PRIMARY KEY,
    payment_type        VARCHAR(20),
    amount      NUMERIC(12,2) CHECK (amount >= 0),
    due_time    TIMESTAMP,
    status      payment_status,
    paid_at     TIMESTAMP
);


-- 14. PAYMENT_DELETE_REQUESTS (depends on PAYMENTS, STAFFS)
CREATE TYPE delete_request_status AS ENUM ('Pending', 'Refused');

CREATE TABLE PAYMENT_DELETE_REQUESTS (
    request_id    SERIAL PRIMARY KEY,
    payment_id    INT NOT NULL,
    requested_by  CHAR(10) NOT NULL,
    requested_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status        delete_request_status DEFAULT 'Pending',
    reviewed_by   CHAR(10) DEFAULT NULL,
    reviewed_at   TIMESTAMP DEFAULT NULL,
    FOREIGN KEY (payment_id)   REFERENCES PAYMENTS(payment_id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES STAFFS(staff_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by)  REFERENCES STAFFS(staff_id) ON DELETE CASCADE,
    UNIQUE (payment_id)
);


-- 15. FEES (depends on STUDENTS, PAYMENTS)
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


-- 16. SALARY (depends on STAFFS, PAYMENTS)
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


-- 17. DONATIONS (no dependencies)
CREATE TYPE donation_status AS ENUM ('Pending', 'Approved', 'Refused');

CREATE TABLE DONATIONS( --14
    donation_id SERIAL PRIMARY KEY,
    status      donation_status DEFAULT 'Pending',
    description TEXT,
    start_date  DATE DEFAULT CURRENT_DATE,
    end_date    DATE
);


-- 18. GENERATES (depends on PAYMENTS, DONATIONS)
CREATE TABLE GENERATES( --15
    payment_id  INT PRIMARY KEY,
    donation_id INT,
    FOREIGN KEY (payment_id)
        REFERENCES PAYMENTS(payment_id)
        ON DELETE CASCADE,
    FOREIGN KEY (donation_id)
        REFERENCES DONATIONS(donation_id)
        ON DELETE CASCADE
);


-- 19. ASKS_FOR (depends on DONATIONS, STUDENTS, STAFFS)
CREATE TABLE ASKS_FOR(
    donation_id INT NOT NULL,
    student_id CHAR(7),
    staff_id CHAR(10),
    PRIMARY KEY(donation_id),
    FOREIGN KEY(donation_id) REFERENCES DONATIONS(donation_id) ON DELETE CASCADE,
    FOREIGN KEY(student_id) REFERENCES STUDENTS(student_id) ON DELETE CASCADE,
    FOREIGN KEY(staff_id) REFERENCES STAFFS(staff_id) ON DELETE CASCADE,
    CONSTRAINT at_least_one_requester CHECK (
        (student_id IS NOT NULL) OR (staff_id IS NOT NULL)
    )
);


-- 20. EVENTS (depends on HALLS)
CREATE TABLE EVENTS( --17
    event_id    SERIAL PRIMARY KEY,
    name        VARCHAR(50),
    description TEXT,
    date        DATE,
    hall_id     INT,
    video_link TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    FOREIGN KEY(hall_id)
        REFERENCES HALLS(hall_id)
        ON DELETE CASCADE
);


-- 21. STUDENT_HIDDEN_EVENTS (depends on STUDENTS, EVENTS)
CREATE TABLE STUDENT_HIDDEN_EVENTS (
    student_id VARCHAR(50) REFERENCES STUDENTS(student_id) ON DELETE CASCADE,
    event_id INT REFERENCES EVENTS(event_id) ON DELETE CASCADE,
    PRIMARY KEY (student_id, event_id)
);


-- 22. NOTICE (depends on STAFFS)
CREATE TABLE NOTICE ( --18
    notice_id    SERIAL PRIMARY KEY,
    staff_id     CHAR(10) NOT NULL REFERENCES STAFFS(staff_id) ON DELETE SET NULL,
    title        VARCHAR(150),
    description  TEXT,
    pdf_file     BYTEA,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_public    BOOLEAN DEFAULT FALSE
);


-- 23. STUDENT_NOTICE_STATES (depends on STUDENTS, NOTICE)
CREATE TABLE STUDENT_NOTICE_STATES (
    student_id CHAR(7) REFERENCES STUDENTS(student_id) ON DELETE CASCADE,
    notice_id  INT     REFERENCES NOTICE(notice_id) ON DELETE CASCADE,
    is_read    BOOLEAN DEFAULT FALSE,
    is_hidden  BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (student_id, notice_id)
);


-- 24. TASKS (depends on STAFFS)
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE task_status   AS ENUM ('pending', 'in_progress', 'completed', 'cancelled', 'submitted');

CREATE TABLE TASKS (
    task_id     SERIAL PRIMARY KEY,
    provost_id  CHAR(10) NOT NULL,
    title       VARCHAR(150) NOT NULL,
    description TEXT,
    priority    task_priority DEFAULT 'medium',
    status      task_status DEFAULT 'pending',
    due_date    DATE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP,
    FOREIGN KEY (provost_id) 
        REFERENCES STAFFS(staff_id) 
        ON DELETE CASCADE
);


-- 25. TASK_ASSIGNMENTS (depends on TASKS, STAFFS)
CREATE TABLE task_assignments (
    assignment_id SERIAL PRIMARY KEY,
    task_id       INT NOT NULL,
    staff_id      CHAR(10) NOT NULL,
    assigned_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    seen_at       TIMESTAMP,
    FOREIGN KEY (task_id) 
        REFERENCES TASKS(task_id) 
        ON DELETE CASCADE,
    FOREIGN KEY (staff_id) 
        REFERENCES STAFFS(staff_id) 
        ON DELETE CASCADE,
        
    UNIQUE (task_id, staff_id) 
);


-- =============================================
-- FORUM FEATURE - ADD TO EXISTING SCHEMA
-- =============================================

-- 26. GENRES (no dependencies)
CREATE TABLE GENRES (
    genre_id   SERIAL PRIMARY KEY,
    name       VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
 
INSERT INTO GENRES (name) VALUES
    ('Studying'),
    ('Entertainment'),
    ('Sports'),
    ('Food'),
    ('Announcements'),
    ('LostAndFound'),
    ('Rant'),
    ('Other');


-- 27. POSTS (depends on USERS, HALLS)
CREATE TABLE POSTS (
    post_id    SERIAL PRIMARY KEY,
    user_id    VARCHAR(50) NOT NULL,
    hall_id    INT NOT NULL,
    title      VARCHAR(200) NOT NULL,
    content    TEXT NOT NULL,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP,
    is_public   BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES USERS(user_id) ON DELETE CASCADE,
    FOREIGN KEY (hall_id) REFERENCES HALLS(hall_id) ON DELETE CASCADE
);


-- 28. POST_GENRES (depends on POSTS, GENRES)
CREATE TABLE POST_GENRES (
    post_id  INT NOT NULL,
    genre_id INT NOT NULL,
    PRIMARY KEY (post_id, genre_id),
    FOREIGN KEY (post_id)  REFERENCES POSTS(post_id)  ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES GENRES(genre_id) ON DELETE CASCADE
);


-- 29. COMMENTS (depends on POSTS, USERS, self-reference)
CREATE TABLE COMMENTS (
    comment_id        SERIAL PRIMARY KEY,
    post_id           INT NOT NULL,
    user_id           VARCHAR(50) NOT NULL,
    parent_comment_id INT DEFAULT NULL,
    content           TEXT NOT NULL,
    is_deleted        BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP,
    FOREIGN KEY (post_id)           REFERENCES POSTS(post_id)       ON DELETE CASCADE,
    FOREIGN KEY (user_id)           REFERENCES USERS(user_id)       ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES COMMENTS(comment_id) ON DELETE CASCADE
);


-- 30. POST_LIKES (depends on POSTS, USERS)
CREATE TABLE POST_LIKES (
    post_id    INT NOT NULL,
    user_id    VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY (post_id)  REFERENCES POSTS(post_id)  ON DELETE CASCADE,
    FOREIGN KEY (user_id)  REFERENCES USERS(user_id)  ON DELETE CASCADE
);


-- 31. NOTIFICATIONS (depends on STUDENTS)
CREATE TYPE notification_type AS ENUM ('DONATION', 'EVENT', 'NOTICE', 'PAYMENT', 'COMPLAINT', 'SEAT APPLICATION');

CREATE TABLE NOTIFICATIONS (
    notification_id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES STUDENTS(student_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    target_url VARCHAR(255) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);