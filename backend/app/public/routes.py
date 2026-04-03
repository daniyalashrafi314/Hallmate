from flask import Blueprint, jsonify
from app.db import execute_read_query

public_bp = Blueprint('public', __name__)

@public_bp.route('/landing-data', methods=['GET'])
def get_landing_data():
    # 1. Fetch all halls ordered by ID
    halls = execute_read_query("SELECT hall_id, name FROM HALLS ORDER BY hall_id ASC")
    
    result = []
    for h in halls:
        hid = h['hall_id']
        
        # 2. Get Stats
        rooms_count = execute_read_query("SELECT COUNT(*) as count FROM ROOMS WHERE hall_id = %s", (hid,))
        students_count = execute_read_query("SELECT COUNT(*) as count FROM STUDENTS WHERE hall_id = %s", (hid,))
        
        # 3. Get Upcoming Events (filtering out past events)
        events = execute_read_query("""
            SELECT name, description, date 
            FROM EVENTS 
            WHERE hall_id = %s AND date >= CURRENT_DATE 
            ORDER BY date ASC LIMIT 3
        """, (hid,))
        
        # 4. Get Public Notices 
        # (Assuming notices are global. If they are tied to a hall, add 'AND hall_id = %s')
        notices = execute_read_query("""
            SELECT title, description, date 
            FROM NOTICES 
            WHERE is_public = TRUE 
            ORDER BY date DESC LIMIT 3
        """)
        
        result.append({
            "hall_id": hid,
            "name": h['name'],
            "total_rooms": rooms_count[0]['count'] if rooms_count else 0,
            "total_residents": students_count[0]['count'] if students_count else 0,
            "events": events,
            "notices": notices
        })
        
    return jsonify(result), 200