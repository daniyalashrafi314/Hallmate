from flask import Blueprint, request, jsonify
from app.db import execute_read_query, get_db_connection
from app.auth.middleware import token_required

super_user_bp = Blueprint('super_user', __name__)

@super_user_bp.route('/provosts-staffs', methods=['GET'])
@token_required(allowed_roles=['super_user'])
def get_all_provosts_and_staffs():
    halls_query = """
        SELECT
            h.hall_id,
            h.name AS hall_name,
            h.provost_id,
            p.user_id AS provost_user_id,
            p.name AS provost_name,
            p.phone_number AS provost_phone_number,
            p.role AS provost_role
        FROM HALLS h
        LEFT JOIN STAFFS p ON h.provost_id = p.staff_id
        ORDER BY h.hall_id
    """

    staffs_query = """
        SELECT
            staff_id,
            user_id,
            name,
            phone_number,
            role,
            hall_id,
            salary
        FROM STAFFS
        ORDER BY hall_id, role DESC, name
    """

    halls = execute_read_query(halls_query)
    staffs = execute_read_query(staffs_query)

    return jsonify({
        'halls': halls,
        'staffs': staffs
    }), 200


@super_user_bp.route('/promote-provost', methods=['PUT'])
@token_required(allowed_roles=['super_user'])
def promote_staff_to_provost():
    data = request.get_json() or {}
    staff_id = data.get('staff_id')

    if not staff_id:
        return jsonify({'error': 'staff_id is required'}), 400

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT staff_id, hall_id, role FROM STAFFS WHERE staff_id = %s",
                    (staff_id,)
                )
                target = cur.fetchone()

                if not target:
                    return jsonify({'error': 'Staff member not found'}), 404

                hall_id = target['hall_id']
                current_role = target['role']

                if current_role and current_role.lower() == 'provost':
                    return jsonify({'message': 'This staff member is already a provost.'}), 200

                cur.execute(
                    "SELECT provost_id FROM HALLS WHERE hall_id = %s",
                    (hall_id,)
                )
                hall_row = cur.fetchone()
                current_provost_id = hall_row['provost_id'] if hall_row else None

                if current_provost_id and current_provost_id != staff_id:
                    cur.execute(
                        "UPDATE STAFFS SET role = 'Staff' WHERE staff_id = %s",
                        (current_provost_id,)
                    )

                cur.execute(
                    "UPDATE STAFFS SET role = 'Provost' WHERE staff_id = %s",
                    (staff_id,)
                )

                cur.execute(
                    "UPDATE HALLS SET provost_id = %s WHERE hall_id = %s",
                    (staff_id, hall_id)
                )

        return jsonify({'message': 'Staff promoted to provost successfully.'}), 200

    except Exception as exc:
        print(f"Error promoting provost: {exc}")
        return jsonify({'error': 'Failed to promote staff to provost.'}), 500
