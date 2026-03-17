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
     
    return app