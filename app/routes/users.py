from flask import Blueprint, request, jsonify
from pydantic import ValidationError
import logging
from app.models import *
from app.database import *
from app.utils import token_required
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone, timedelta
import jwt
import os

# Initialize logger
logger = logging.getLogger(__name__)

bp = Blueprint('users', __name__, url_prefix='/users')

@bp.route('/register', methods=['POST'])
@token_required
def log_access_endpoint(current_user):
    try:
        # Log the start of the request processing
        logger.info("Received request to create a new user")

        # Validate the input data using Pydantic
        data = UserRequest(**request.get_json())
        logger.debug(f"Validated input data: {data.dict()}")

    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")  # Log the validation error
        return jsonify({"error": str(e)}), 400    

    db = next(get_db())

    existing_user = db.query(User).filter(User.username == data.username).first()
    if existing_user:
        return jsonify({"error": "User already exists"}), 400

    hashed_password = generate_password_hash(data.password)
    new_user = User(username=data.username, password=hashed_password)
    db.add(new_user)
    db.commit()

    logger.info(f"User created: {data.username}")

    # Return customer details if access is logged
    return jsonify({
        "message": f"Utente {data.username} creato"
    }), 200

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    username = data.get('username')
    password = data.get('password')

    db = next(get_db())
    user = db.query(User).filter(User.username == username).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "Credenziali non valide"}), 401

    token = jwt.encode(
        {
            "user_id": user.id,
            "exp": datetime.now(timezone.utc) + timedelta(days=30),
        },
        os.getenv("SECRET_KEY"),
        algorithm="HS256",
    )
    return jsonify({"token": token})

@bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):    
    return jsonify({"message": f"Utente sloggato"})
