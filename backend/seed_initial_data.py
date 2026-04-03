from app.db import get_db_connection
from app.security.passwords import hash_password


HALL_NAMES = [
    "Ahsanullah Hall",
    "Titumir Hall",
    "Sher-e-Bangla Hall",
    "Sohrawardy Hall",
    "Nazrul Islam Hall",
    "Dr. M A Rashid Hall",
    "Shahid Smriti Hall",
]

STUDENT_NAMES = [
    "Rahim Uddin",
    "Karim Hossain",
    "Jahid Hasan",
    "Mahmudul Islam",
    "Nayeem Ahmed",
    "Sabbir Hossain",
    "Tanvir Rahman",
    "Nafis Iqbal",
    "Ashikur Rahman",
    "Shakib Hasan",
    "Rafiul Karim",
    "Rakibul Islam",
    "Fahim Hossain",
    "Tariqul Islam",
    "Mehedi Hasan",
    "Mizanur Rahman",
    "Saifur Rahman",
    "Nazmul Huda",
    "Imran Hossain",
    "Hasibul Islam",
]


def staff_id(n: int) -> str:
    return f"STF{n:07d}"


def student_id(n: int) -> str:
    return f"{n:07d}"


def run_seed() -> None:
    hashed_password = hash_password("1234")

    users_inserted = 0
    halls_inserted = 0
    staffs_inserted = 0
    students_inserted = 0
    rooms_inserted = 0
    seats_inserted = 0

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            # 1) One admin user
            cur.execute(
                """
                INSERT INTO USERS (user_id, email_address, password)
                VALUES (%s, %s, %s)
                ON CONFLICT (user_id) DO NOTHING
                """,
                ("ADM01", "admin@hallmate.buet.ac.bd", hashed_password),
            )
            users_inserted += cur.rowcount

            # 2) Halls (insert first with provost_id = NULL)
            hall_ids = []
            for name in HALL_NAMES:
                cur.execute(
                    """
                    SELECT hall_id
                    FROM HALLS
                    WHERE name = %s
                    ORDER BY hall_id
                    LIMIT 1
                    """,
                    (name,),
                )
                existing_hall = cur.fetchone()

                if existing_hall:
                    hall_ids.append(existing_hall["hall_id"])
                    continue

                cur.execute(
                    """
                    INSERT INTO HALLS (name, provost_id)
                    VALUES (%s, NULL)
                    RETURNING hall_id
                    """,
                    (name,),
                )
                hall_id = cur.fetchone()["hall_id"]
                hall_ids.append(hall_id)
                halls_inserted += 1

            # 3) Per hall: one provost + one staff
            serial = 1
            student_serial = 2305001
            for idx, hall_id in enumerate(hall_ids):
                provost_staff_id = staff_id(serial)
                serial += 1
                regular_staff_id = staff_id(serial)
                serial += 1

                provost_email = f"provost{idx + 1}@hallmate.buet.ac.bd"
                staff_email = f"staff{idx + 1}@hallmate.buet.ac.bd"

                # Create user accounts for both staff members
                cur.execute(
                    """
                    INSERT INTO USERS (user_id, email_address, password)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (user_id) DO NOTHING
                    """,
                    (provost_staff_id, provost_email, hashed_password),
                )
                users_inserted += cur.rowcount

                cur.execute(
                    """
                    INSERT INTO USERS (user_id, email_address, password)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (user_id) DO NOTHING
                    """,
                    (regular_staff_id, staff_email, hashed_password),
                )
                users_inserted += cur.rowcount

                # Provost row
                cur.execute(
                    """
                    INSERT INTO STAFFS (staff_id, hall_id, user_id, name, phone_number, role, salary)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (staff_id) DO NOTHING
                    """,
                    (
                        provost_staff_id,
                        hall_id,
                        provost_staff_id,
                        f"Provost {idx + 1}",
                        f"0171000{idx + 1:03d}",
                        "Provost",
                        70000,
                    ),
                )
                staffs_inserted += cur.rowcount

                # Regular staff row
                cur.execute(
                    """
                    INSERT INTO STAFFS (staff_id, hall_id, user_id, name, phone_number, role, salary)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (staff_id) DO NOTHING
                    """,
                    (
                        regular_staff_id,
                        hall_id,
                        regular_staff_id,
                        f"Staff {idx + 1}",
                        f"0181000{idx + 1:03d}",
                        "Staff",
                        35000,
                    ),
                )
                staffs_inserted += cur.rowcount

                # Update hall's provost_id after provost exists
                cur.execute(
                    """
                    UPDATE HALLS
                    SET provost_id = %s
                    WHERE hall_id = %s
                    """,
                    (provost_staff_id, hall_id),
                )

                # 4) Students: 10 attached students per hall
                for s in range(10):
                    sid = student_id(student_serial)
                    student_serial += 1
                    student_name = STUDENT_NAMES[(idx * 10 + s) % len(STUDENT_NAMES)]
                    student_email = f"{sid}@student.hallmate.buet.ac.bd"

                    cur.execute(
                        """
                        INSERT INTO USERS (user_id, email_address, password)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (user_id) DO NOTHING
                        """,
                        (sid, student_email, hashed_password),
                    )
                    users_inserted += cur.rowcount

                    cur.execute(
                        """
                        INSERT INTO STUDENTS (student_id, hall_id, user_id, name, phone_number, status)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        ON CONFLICT (student_id) DO NOTHING
                        """,
                        (
                            sid,
                            hall_id,
                            sid,
                            student_name,
                            f"0192000{idx + 1:02d}{s + 1:02d}",
                            "ATTACHED",
                        ),
                    )
                    students_inserted += cur.rowcount

                # 5) Rooms: 12 per hall, room IDs like 101..112, 201..212, ... 701..712
                for room_no in range(1, 13):
                    room_id = f"{idx + 1}{room_no:02d}"
                    seat_capacity = [2, 3, 4][(room_no - 1) % 3]

                    cur.execute(
                        """
                        INSERT INTO ROOMS (room_id, hall_id, capacity)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (room_id) DO NOTHING
                        """,
                        (room_id, hall_id, seat_capacity),
                    )
                    rooms_inserted += cur.rowcount

                    # 6) Seats: 2/3/4 seats per room by rotation
                    for seat_no in range(1, seat_capacity + 1):
                        cur.execute(
                            """
                            INSERT INTO SEATS (seat_number, room_id, status)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (room_id, seat_number) DO NOTHING
                            """,
                            (seat_no, room_id, "vacant"),
                        )
                        seats_inserted += cur.rowcount

    print("Seed completed.")
    print(f"Inserted USERS: {users_inserted}")
    print(f"Inserted HALLS: {halls_inserted}")
    print(f"Inserted STAFFS: {staffs_inserted}")
    print(f"Inserted STUDENTS: {students_inserted}")
    print(f"Inserted ROOMS: {rooms_inserted}")
    print(f"Inserted SEATS: {seats_inserted}")


if __name__ == "__main__":
    run_seed()
