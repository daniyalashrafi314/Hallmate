# app/staff/__init__.py
from flask import Blueprint

staff_bp = Blueprint('admin', __name__)

from . import routes