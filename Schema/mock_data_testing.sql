INSERT INTO HALLS (name, provost)
VALUES
('Ahsanullah Hall', 'Dr. Rahman'),
('Suhrawardy Hall', 'Dr. Karim');


INSERT INTO USERS (user_id, email_address, password)
VALUES
('u_student1', 's1@buet.ac.bd', 'hashed_pw1'),
('u_student2', 's2@buet.ac.bd', 'hashed_pw2'),
('u_staff1',   'staff1@buet.ac.bd', 'hashed_pw3');

INSERT INTO STUDENTS (student_id, hall_id, user_id, name, phone_number, status)
VALUES
('2305101', 1, 'u_student1', 'Rahim Uddin', '01711111111', 'RESIDENT'),
('2305102', 2, 'u_student2', 'Karim Ali',  '01822222222', 'ATTACHED');

INSERT INTO VISITORS
(visitor_id, student_id, name, phone_number, relationship, entry_time)
VALUES
('20260129-01', '2305101', 'Mr. Uddin', '01933333333', 'Father', CURRENT_TIMESTAMP);

INSERT INTO COMPLAINTS
(student_id, complaint_type, description)
VALUES
('2305101', 'Facilities', 'Water supply problem');

INSERT INTO SEAT_APPLICATION
(student_id, description, priority_value)
VALUES
('2305102', 'Need seat urgently', 1);

INSERT INTO ROOMS (room_id, hall_id, capacity)
VALUES
('101', 1, 4),
('102', 1, 4);

INSERT INTO SEATS (room_id, seat_number, status)
VALUES
('101', 1, 'Vacant'),
('101', 2, 'Occupied');

INSERT INTO ALLOCATIONS
(student_id, room_id, seat_number)
VALUES
('2305101', '101', 2);

INSERT INTO STAFFS
(staff_id, hall_id, user_id, name, phone_number, role, salary)
VALUES
('STF0000001', 1, 'u_staff1', 'Mr. Alam', '01644444444', 'Provost', 60000);

INSERT INTO PAYMENTS
(payment_type, amount, due_time, status)
VALUES
('Hall Fee', 3000, CURRENT_TIMESTAMP, 'Due'),
('Salary',   60000, CURRENT_TIMESTAMP, 'Paid');

INSERT INTO FEES (payment_id, student_id)
VALUES
(1, '2305101');

INSERT INTO DONATIONS (description)
VALUES
('Flood relief fund');

INSERT INTO GENERATES (payment_id, donation_id)
VALUES
(1, 1);

INSERT INTO ASKS_FOR (donation_id, student_id)
VALUES
(1, '2305101');

INSERT INTO EVENTS (name, description, date, hall_id)
VALUES
('Hall Day', 'Annual cultural program', CURRENT_DATE, 1);

INSERT INTO NOTICE (staff_id, title, description)
VALUES
('STF0000001', 'Water Shutdown', 'Water supply will be off tonight');

