# app/staff/__init__.py
from flask import Blueprint

staff_bp = Blueprint('staff', __name__)

from . import routes