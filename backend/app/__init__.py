from flask import Flask
from flask_cors import CORS

def create_app():
    #app = Flask(__name__)

    # Register the Staff Blueprint
    # All staff routes will be prefixed with /staff
    #app.register_blueprint(staff_bp, url_prefix='/staff')
    app = Flask(__name__)
    CORS(app)

    from app.staff.routes import staff_bp
    app.register_blueprint(staff_bp, url_prefix="/staff")

    from app.student.routes import student_bp  # Adjust the import path if your routes.py is in a different folder
    app.register_blueprint(student_bp, url_prefix="/student")

    from app.student.forum_routes import student_forum_bp
    app.register_blueprint(student_forum_bp, url_prefix="/student")

    from app.admin.routes import admin_bp 
    app.register_blueprint(admin_bp, url_prefix='/admin')

    from app.admin.forum_routes import admin_forum_bp
    app.register_blueprint(admin_forum_bp, url_prefix='/admin')

    from app.super_user.routes import super_user_bp
    app.register_blueprint(super_user_bp, url_prefix='/super-user')

    from app.auth.routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')

    from app.public.routes import public_bp
    app.register_blueprint(public_bp, url_prefix='/public')

    from app.staff.forum_routes import staff_forum_bp
    app.register_blueprint(staff_forum_bp, url_prefix='/staff')
    
    return app