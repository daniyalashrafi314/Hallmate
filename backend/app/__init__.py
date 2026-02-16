from flask import Flask
from .staff.routes import staff_bp

def create_app():
    app = Flask(__name__)

    # Register the Staff Blueprint
    # All staff routes will be prefixed with /staff
    app.register_blueprint(staff_bp, url_prefix='/staff')

    return app