from flask import Blueprint, request, jsonify, Response
from app.db import execute_read_query, execute_write_query
from app.auth.middleware import token_required

staff_forum_bp = Blueprint('staff_forum', __name__) # attach to your existing blueprint


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def get_current_hall_id(staff_id):
    result = execute_read_query(
        "SELECT hall_id FROM STAFFS WHERE staff_id = %s", (staff_id,)
    )
    return result[0]['hall_id'] if result else None


def get_user_id_for_staff(staff_id):
    result = execute_read_query(
        "SELECT user_id FROM STAFFS WHERE staff_id = %s", (staff_id,)
    )
    return result[0]['user_id'] if result else None


# Resolves any user_id → name, entity_id, hall, room (if resident student).
# Used both for post-list cards and the profile modal.
AUTHOR_LOOKUP_SQL = """
    SELECT
        u.user_id,
        COALESCE(st.name, sf.name)          AS display_name,
        COALESCE(st.student_id, sf.staff_id) AS entity_id,
        CASE
            WHEN st.student_id IS NOT NULL THEN 'student'
            ELSE 'staff'
        END                                  AS user_type,
        COALESCE(
            h_st.name,
            h_sf.name
        )                                    AS hall_name,
        COALESCE(
            (st.photo IS NOT NULL),
            (sf.photo IS NOT NULL)
        )                                    AS has_photo,
        -- room only for resident students with an active allocation
        CASE
            WHEN st.status = 'RESIDENT' THEN a.room_id
            ELSE NULL
        END                                  AS room_id,
        st.status                            AS student_status,
        sf.role                              AS staff_role
    FROM USERS u
    LEFT JOIN STUDENTS st ON st.user_id = u.user_id
    LEFT JOIN HALLS     h_st ON h_st.hall_id = st.hall_id
    LEFT JOIN ALLOCATIONS a  ON a.student_id = st.student_id AND a.end_date IS NULL
    LEFT JOIN STAFFS    sf ON sf.user_id = u.user_id
    LEFT JOIN HALLS     h_sf ON h_sf.hall_id = sf.hall_id
    WHERE u.user_id = %s
"""


# ─────────────────────────────────────────────────────────────────────────────
# 1. LIST POSTS  –  GET /forum/posts
# ─────────────────────────────────────────────────────────────────────────────
#
# Query params:
#   tab      = general | hall | mine   (default: general)
#   search   = free-text search on title / content
#   genre    = genre name (e.g. "Sports")  — can be repeated for multi-select
#   user_id  = filter by author
#   page     = page number (default 1)
#   limit    = page size   (default 10, max 50)
#
# Response per post:
#   post fields + author card (name, entity_id, user_type, hall, room if any)
#   + like_count + comment_count + viewer_has_liked

@staff_forum_bp.route('/forum/posts', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_forum_posts():
    current_staff_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_staff_id)
    current_user_id  = get_user_id_for_staff(current_staff_id)

    # ── pagination ────────────────────────────────────────────────────────────
    try:
        page  = max(1, int(request.args.get('page', 1)))
        limit = min(50, max(1, int(request.args.get('limit', 10))))
    except ValueError:
        return jsonify({"error": "Invalid pagination params"}), 400
    offset = (page - 1) * limit

    # ── tab ───────────────────────────────────────────────────────────────────
    tab = request.args.get('tab', 'general').lower()
    if tab not in ('general', 'hall', 'mine'):
        return jsonify({"error": "Invalid tab. Use general | hall | mine"}), 400

    # ── optional filters ──────────────────────────────────────────────────────
    search   = request.args.get('search', '').strip()
    genres   = request.args.getlist('genre')          # multi-value
    filter_user = request.args.get('user_id', '').strip()

    # ── build WHERE clauses ───────────────────────────────────────────────────
    conditions = ["p.is_deleted = FALSE"]
    params     = []

    if tab == 'general':
        conditions.append("p.is_public = TRUE")
    elif tab == 'hall':
        conditions.append("p.hall_id = %s")
        params.append(current_hall_id)
    else:  # mine
        conditions.append("p.user_id = %s")
        params.append(current_user_id)

    if search:
        conditions.append("(p.title ILIKE %s OR p.content ILIKE %s)")
        params += [f"%{search}%", f"%{search}%"]

    if genres:
        # post must have AT LEAST ONE of the requested genres
        placeholders = ', '.join(['%s'] * len(genres))
        conditions.append(f"""
            p.post_id IN (
                SELECT pg.post_id FROM POST_GENRES pg
                JOIN GENRES g ON pg.genre_id = g.genre_id
                WHERE g.name ILIKE ANY(ARRAY[{placeholders}])
            )
        """)
        params += genres

    if filter_user:
        conditions.append("p.user_id = %s")
        params.append(filter_user)

    where = "WHERE " + " AND ".join(conditions)

    # ── main query ────────────────────────────────────────────────────────────
    sql = f"""
        SELECT
            p.post_id,
            p.title,
            p.content,
            p.is_public,
            p.user_id,
            p.hall_id,
            TO_CHAR(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
            TO_CHAR(p.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,

            -- author card (no photo bytes)
            COALESCE(st.name, sf.name)            AS author_name,
            COALESCE(st.student_id, sf.staff_id)  AS author_entity_id,
            CASE
                WHEN st.student_id IS NOT NULL THEN 'student'
                ELSE 'staff'
            END                                    AS author_type,
            CASE
                WHEN st.status = 'RESIDENT' THEN a.room_id
                ELSE NULL
            END                                    AS author_room_id,
            COALESCE(
                (st.photo IS NOT NULL),
                (sf.photo IS NOT NULL)
            )                                      AS author_has_photo,

            -- aggregates
            COUNT(DISTINCT pl.user_id)             AS like_count,
            COUNT(DISTINCT c.comment_id)           AS comment_count,
            BOOL_OR(pl.user_id = %s)               AS viewer_has_liked,

            -- genres as array
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT g.name), NULL) AS genres
        FROM POSTS p
        LEFT JOIN USERS     u  ON u.user_id  = p.user_id
        LEFT JOIN STUDENTS  st ON st.user_id = p.user_id
        LEFT JOIN ALLOCATIONS a ON a.student_id = st.student_id AND a.end_date IS NULL
        LEFT JOIN STAFFS    sf ON sf.user_id = p.user_id
        LEFT JOIN POST_LIKES pl ON pl.post_id = p.post_id
        LEFT JOIN COMMENTS  c  ON c.post_id  = p.post_id AND c.is_deleted = FALSE
        LEFT JOIN POST_GENRES pg ON pg.post_id = p.post_id
        LEFT JOIN GENRES    g  ON g.genre_id = pg.genre_id
        {where}
        GROUP BY
            p.post_id, p.title, p.content, p.is_public, p.user_id,
            p.hall_id, p.created_at, p.updated_at,
            st.name, st.student_id, st.status, st.photo,
            sf.name, sf.staff_id, sf.photo,
            a.room_id
        ORDER BY p.created_at DESC
        LIMIT %s OFFSET %s
    """
    # viewer_has_liked param comes first, then where params, then pagination
    query_params = tuple([current_user_id] + params + [limit, offset])
    posts = execute_read_query(sql, query_params)

    # ── count query (for pagination meta) ─────────────────────────────────────
    count_sql = f"""
        SELECT COUNT(DISTINCT p.post_id) AS total
        FROM POSTS p
        LEFT JOIN POST_GENRES pg ON pg.post_id = p.post_id
        LEFT JOIN GENRES g ON g.genre_id = pg.genre_id
        {where}
    """
    total_result = execute_read_query(count_sql, tuple(params))
    total = total_result[0]['total'] if total_result else 0

    return jsonify({
        "posts": posts or [],
        "pagination": {
            "page":        page,
            "limit":       limit,
            "total_posts": total,
            "total_pages": (total + limit - 1) // limit
        }
    }), 200


# ─────────────────────────────────────────────────────────────────────────────
# 2. CREATE POST  –  POST /forum/posts
# ─────────────────────────────────────────────────────────────────────────────

@staff_forum_bp.route('/forum/posts', methods=['POST'])
@token_required(allowed_roles=['staff'])
def create_post():
    current_staff_id = request.current_user_id
    current_hall_id  = get_current_hall_id(current_staff_id)
    current_user_id  = get_user_id_for_staff(current_staff_id)

    data      = request.get_json() or {}
    title     = (data.get('title') or '').strip()
    content   = (data.get('content') or '').strip()
    is_public = bool(data.get('is_public', False))
    genres    = data.get('genres', [])   # list of genre names

    if not title:
        return jsonify({"error": "Title is required"}), 400
    if len(title) > 200:
        return jsonify({"error": "Title too long (max 200 chars)"}), 400
    if not content:
        return jsonify({"error": "Content is required"}), 400

    # ── insert post ───────────────────────────────────────────────────────────
    insert_sql = """
        INSERT INTO POSTS (user_id, hall_id, title, content, is_public)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING post_id
    """
    result = execute_write_query(
        insert_sql, (current_user_id, current_hall_id, title, content, is_public)
    )
    if not result:
        return jsonify({"error": "Failed to create post"}), 500

    post_id = result[0]['post_id'] if isinstance(result, list) else result

    # ── attach genres ─────────────────────────────────────────────────────────
    if genres:
        genre_sql = """
            INSERT INTO POST_GENRES (post_id, genre_id)
            SELECT %s, genre_id FROM GENRES WHERE name = ANY(%s)
            ON CONFLICT DO NOTHING
        """
        execute_write_query(genre_sql, (post_id, genres))

    return jsonify({"post_id": post_id, "message": "Post created"}), 201


# ─────────────────────────────────────────────────────────────────────────────
# 3. GET SINGLE POST  –  GET /forum/posts/<post_id>
# ─────────────────────────────────────────────────────────────────────────────

@staff_forum_bp.route('/forum/posts/<int:post_id>', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_post(post_id):
    current_staff_id = request.current_user_id
    current_user_id  = get_user_id_for_staff(current_staff_id)

    sql = """
        SELECT
            p.post_id,
            p.title,
            p.content,
            p.is_public,
            p.user_id,
            p.hall_id,
            h.name                                              AS hall_name,
            TO_CHAR(p.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
            TO_CHAR(p.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,

            COALESCE(st.name, sf.name)            AS author_name,
            COALESCE(st.student_id, sf.staff_id)  AS author_entity_id,
            CASE
                WHEN st.student_id IS NOT NULL THEN 'student'
                ELSE 'staff'
            END                                    AS author_type,
            CASE
                WHEN st.status = 'RESIDENT' THEN a.room_id
                ELSE NULL
            END                                    AS author_room_id,
            COALESCE(
                (st.photo IS NOT NULL),
                (sf.photo IS NOT NULL)
            )                                      AS author_has_photo,

            COUNT(DISTINCT pl.user_id)             AS like_count,
            COUNT(DISTINCT c.comment_id)           AS comment_count,
            BOOL_OR(pl.user_id = %s)               AS viewer_has_liked,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT g.name), NULL) AS genres
        FROM POSTS p
        JOIN HALLS h ON h.hall_id = p.hall_id
        LEFT JOIN USERS    u  ON u.user_id  = p.user_id
        LEFT JOIN STUDENTS st ON st.user_id = p.user_id
        LEFT JOIN ALLOCATIONS a ON a.student_id = st.student_id AND a.end_date IS NULL
        LEFT JOIN STAFFS   sf ON sf.user_id = p.user_id
        LEFT JOIN POST_LIKES pl ON pl.post_id = p.post_id
        LEFT JOIN COMMENTS  c  ON c.post_id = p.post_id AND c.is_deleted = FALSE
        LEFT JOIN POST_GENRES pg ON pg.post_id = p.post_id
        LEFT JOIN GENRES    g  ON g.genre_id = pg.genre_id
        WHERE p.post_id = %s AND p.is_deleted = FALSE
        GROUP BY
            p.post_id, p.title, p.content, p.is_public, p.user_id,
            p.hall_id, h.name, p.created_at, p.updated_at,
            st.name, st.student_id, st.status, st.photo,
            sf.name, sf.staff_id, sf.photo, a.room_id
    """
    result = execute_read_query(sql, (current_user_id, post_id))
    if not result:
        return jsonify({"error": "Post not found"}), 404

    return jsonify(result[0]), 200


# ─────────────────────────────────────────────────────────────────────────────
# 4. EDIT POST  –  PUT /forum/posts/<post_id>
# ─────────────────────────────────────────────────────────────────────────────

@staff_forum_bp.route('/forum/posts/<int:post_id>', methods=['PUT'])
@token_required(allowed_roles=['staff'])
def edit_post(post_id):
    current_staff_id = request.current_user_id
    current_user_id  = get_user_id_for_staff(current_staff_id)

    data      = request.get_json() or {}
    title     = (data.get('title') or '').strip()
    content   = (data.get('content') or '').strip()
    is_public = data.get('is_public')
    genres    = data.get('genres')   # None means "don't change", [] means "clear"

    if not title:
        return jsonify({"error": "Title is required"}), 400
    if len(title) > 200:
        return jsonify({"error": "Title too long"}), 400
    if not content:
        return jsonify({"error": "Content is required"}), 400

    fields  = ["title = %s", "content = %s", "updated_at = CURRENT_TIMESTAMP"]
    values  = [title, content]

    if is_public is not None:
        fields.append("is_public = %s")
        values.append(bool(is_public))

    values += [post_id, current_user_id]

    update_sql = f"""
        UPDATE POSTS
        SET {', '.join(fields)}
        WHERE post_id = %s
          AND user_id = %s
          AND is_deleted = FALSE
        RETURNING post_id
    """
    result = execute_write_query(update_sql, tuple(values))
    if not result:
        return jsonify({"error": "Post not found or you are not the author"}), 403

    # ── replace genres if provided ────────────────────────────────────────────
    if genres is not None:
        execute_write_query(
            "DELETE FROM POST_GENRES WHERE post_id = %s", (post_id,)
        )
        if genres:
            genre_sql = """
                INSERT INTO POST_GENRES (post_id, genre_id)
                SELECT %s, genre_id FROM GENRES WHERE name = ANY(%s)
                ON CONFLICT DO NOTHING
            """
            execute_write_query(genre_sql, (post_id, genres))

    return jsonify({"message": "Post updated"}), 200


# ─────────────────────────────────────────────────────────────────────────────
# 5. DELETE POST  –  DELETE /forum/posts/<post_id>  (soft delete)
# ─────────────────────────────────────────────────────────────────────────────

@staff_forum_bp.route('/forum/posts/<int:post_id>', methods=['DELETE'])
@token_required(allowed_roles=['staff'])
def delete_post(post_id):
    current_staff_id = request.current_user_id
    current_user_id  = get_user_id_for_staff(current_staff_id)

    sql = """
        UPDATE POSTS
        SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE post_id = %s
          AND user_id = %s
          AND is_deleted = FALSE
        RETURNING post_id
    """
    result = execute_write_query(sql, (post_id, current_user_id))
    if not result:
        return jsonify({"error": "Post not found or unauthorized"}), 403

    return jsonify({"message": "Post deleted"}), 200


# ─────────────────────────────────────────────────────────────────────────────
# 6. TOGGLE LIKE  –  POST /forum/posts/<post_id>/like
# ─────────────────────────────────────────────────────────────────────────────
# Returns the new liked state and the updated count.

@staff_forum_bp.route('/forum/posts/<int:post_id>/like', methods=['POST'])
@token_required(allowed_roles=['staff'])
def toggle_like(post_id):
    current_staff_id = request.current_user_id
    current_user_id  = get_user_id_for_staff(current_staff_id)

    # Check post exists
    post_check = execute_read_query(
        "SELECT post_id FROM POSTS WHERE post_id = %s AND is_deleted = FALSE",
        (post_id,)
    )
    if not post_check:
        return jsonify({"error": "Post not found"}), 404

    # Check current like state
    existing = execute_read_query(
        "SELECT 1 FROM POST_LIKES WHERE post_id = %s AND user_id = %s",
        (post_id, current_user_id)
    )

    if existing:
        execute_write_query(
            "DELETE FROM POST_LIKES WHERE post_id = %s AND user_id = %s",
            (post_id, current_user_id)
        )
        liked = False
    else:
        execute_write_query(
            "INSERT INTO POST_LIKES (post_id, user_id) VALUES (%s, %s)",
            (post_id, current_user_id)
        )
        liked = True

    # Return fresh count
    count_result = execute_read_query(
        "SELECT COUNT(*) AS like_count FROM POST_LIKES WHERE post_id = %s",
        (post_id,)
    )
    like_count = count_result[0]['like_count'] if count_result else 0

    return jsonify({"liked": liked, "like_count": like_count}), 200


# ─────────────────────────────────────────────────────────────────────────────
# 7. GET COMMENTS  –  GET /forum/posts/<post_id>/comments
# ─────────────────────────────────────────────────────────────────────────────
# Returns top-level comments, each with a nested `replies` list (1 level deep).

@staff_forum_bp.route('/forum/posts/<int:post_id>/comments', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_comments(post_id):
    # Verify post exists
    post_check = execute_read_query(
        "SELECT post_id FROM POSTS WHERE post_id = %s AND is_deleted = FALSE",
        (post_id,)
    )
    if not post_check:
        return jsonify({"error": "Post not found"}), 404

    # Fetch ALL non-deleted comments for this post in one query.
    # We'll assemble the tree in Python — cheaper than recursive SQL for 1-level.
    sql = """
        SELECT
            c.comment_id,
            c.parent_comment_id,
            c.content,
            c.user_id,
            TO_CHAR(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
            TO_CHAR(c.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at,

            COALESCE(st.name, sf.name)            AS author_name,
            COALESCE(st.student_id, sf.staff_id)  AS author_entity_id,
            CASE
                WHEN st.student_id IS NOT NULL THEN 'student'
                ELSE 'staff'
            END                                    AS author_type,
            CASE
                WHEN st.status = 'RESIDENT' THEN a.room_id
                ELSE NULL
            END                                    AS author_room_id,
            COALESCE(
                (st.photo IS NOT NULL),
                (sf.photo IS NOT NULL)
            )                                      AS author_has_photo
        FROM COMMENTS c
        LEFT JOIN USERS    u  ON u.user_id  = c.user_id
        LEFT JOIN STUDENTS st ON st.user_id = c.user_id
        LEFT JOIN ALLOCATIONS a ON a.student_id = st.student_id AND a.end_date IS NULL
        LEFT JOIN STAFFS   sf ON sf.user_id = c.user_id
        WHERE c.post_id    = %s
          AND c.is_deleted = FALSE
        ORDER BY c.created_at ASC
    """
    rows = execute_read_query(sql, (post_id,)) or []

    # ── assemble tree ─────────────────────────────────────────────────────────
    top_level = []
    reply_map = {}   # parent_comment_id → [replies]

    for row in rows:
        row['replies'] = []
        cid = row['comment_id']
        pid = row['parent_comment_id']

        if pid is None:
            top_level.append(row)
            reply_map[cid] = row['replies']
        else:
            if pid in reply_map:
                reply_map[pid].append(row)
            # If parent not found (edge case: parent deleted after children
            # were already fetched), we silently drop the orphan reply
            # rather than crash — you can surface it differently if needed.

    return jsonify({"comments": top_level}), 200


# ─────────────────────────────────────────────────────────────────────────────
# 8. ADD COMMENT / REPLY  –  POST /forum/posts/<post_id>/comments
# ─────────────────────────────────────────────────────────────────────────────
# Body: { "content": "...", "parent_comment_id": <int|null> }
# Enforces max 1-level nesting: if the parent itself has a parent, reject.

@staff_forum_bp.route('/forum/posts/<int:post_id>/comments', methods=['POST'])
@token_required(allowed_roles=['staff'])
def add_comment(post_id):
    current_staff_id = request.current_user_id
    current_user_id  = get_user_id_for_staff(current_staff_id)

    # Verify post exists
    post_check = execute_read_query(
        "SELECT post_id FROM POSTS WHERE post_id = %s AND is_deleted = FALSE",
        (post_id,)
    )
    if not post_check:
        return jsonify({"error": "Post not found"}), 404

    data      = request.get_json() or {}
    content   = (data.get('content') or '').strip()
    parent_id = data.get('parent_comment_id')   # int or None

    if not content:
        return jsonify({"error": "Content is required"}), 400

    # ── enforce 1-level nesting ───────────────────────────────────────────────
    if parent_id is not None:
        parent_check = execute_read_query(
            """
            SELECT comment_id, parent_comment_id
            FROM COMMENTS
            WHERE comment_id = %s AND post_id = %s AND is_deleted = FALSE
            """,
            (parent_id, post_id)
        )
        if not parent_check:
            return jsonify({"error": "Parent comment not found"}), 404

        if parent_check[0]['parent_comment_id'] is not None:
            return jsonify({
                "error": "Replies to replies are not allowed. "
                         "You can only reply to top-level comments."
            }), 400

    insert_sql = """
        INSERT INTO COMMENTS (post_id, user_id, parent_comment_id, content)
        VALUES (%s, %s, %s, %s)
        RETURNING
            comment_id,
            post_id,
            user_id,
            parent_comment_id,
            content,
            TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at
    """
    result = execute_write_query(
        insert_sql, (post_id, current_user_id, parent_id, content)
    )
    if not result:
        return jsonify({"error": "Failed to add comment"}), 500

    new_comment = result[0] if isinstance(result, list) else {"message": "Comment added"}
    return jsonify(new_comment), 201


# ─────────────────────────────────────────────────────────────────────────────
# 9. DELETE COMMENT  –  DELETE /forum/posts/<post_id>/comments/<comment_id>
# ─────────────────────────────────────────────────────────────────────────────

@staff_forum_bp.route('/forum/posts/<int:post_id>/comments/<int:comment_id>', methods=['DELETE'])
@token_required(allowed_roles=['staff'])
def delete_comment(post_id, comment_id):
    current_staff_id = request.current_user_id
    current_user_id  = get_user_id_for_staff(current_staff_id)

    sql = """
        UPDATE COMMENTS
        SET is_deleted = TRUE, updated_at = CURRENT_TIMESTAMP
        WHERE comment_id = %s
          AND post_id    = %s
          AND user_id    = %s
          AND is_deleted = FALSE
        RETURNING comment_id
    """
    result = execute_write_query(sql, (comment_id, post_id, current_user_id))
    if not result:
        return jsonify({"error": "Comment not found or unauthorized"}), 403

    return jsonify({"message": "Comment deleted"}), 200


# ─────────────────────────────────────────────────────────────────────────────
# 10. USER PROFILE MODAL  –  GET /forum/users/<user_id>/profile
# ─────────────────────────────────────────────────────────────────────────────
# Called when a viewer clicks an author's name anywhere in the forum.
# Returns richer info: name, entity_id, hall, room (if resident), role/status,
# has_photo flag.  Photo bytes are intentionally excluded (separate endpoint).

@staff_forum_bp.route('/forum/users/<string:user_id>/profile', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_forum_user_profile(user_id):
    result = execute_read_query(AUTHOR_LOOKUP_SQL, (user_id,))
    if not result:
        return jsonify({"error": "User not found"}), 404

    profile = result[0]

    # Augment with hall_id for students (useful if frontend needs it)
    if profile['user_type'] == 'student':
        extra = execute_read_query(
            "SELECT hall_id FROM STUDENTS WHERE user_id = %s", (user_id,)
        )
        profile['hall_id'] = extra[0]['hall_id'] if extra else None
    else:
        extra = execute_read_query(
            "SELECT hall_id, phone_number FROM STAFFS WHERE user_id = %s", (user_id,)
        )
        if extra:
            profile['hall_id']     = extra[0]['hall_id']
            profile['phone_number'] = extra[0]['phone_number']

    return jsonify(profile), 200


# ─────────────────────────────────────────────────────────────────────────────
# 11. USER PHOTO  –  GET /forum/users/<user_id>/photo
# ─────────────────────────────────────────────────────────────────────────────
# Separate endpoint so the photo only loads when the modal is actually opened
# (avoids pulling BYTEA blobs in every post list response).

@staff_forum_bp.route('/forum/users/<string:user_id>/photo', methods=['GET'])
@token_required(allowed_roles=['staff'])
def get_forum_user_photo(user_id):
    # Try students first, then staff
    sql = """
        SELECT photo FROM STUDENTS WHERE user_id = %s
        UNION ALL
        SELECT photo FROM STAFFS   WHERE user_id = %s
        LIMIT 1
    """
    result = execute_read_query(sql, (user_id, user_id))

    if not result or not result[0].get('photo'):
        return jsonify({"error": "No photo found"}), 404

    return Response(
        result[0]['photo'],
        mimetype='image/jpeg',
        headers={"Content-Disposition": "inline; filename=profile_photo.jpg"}
    )