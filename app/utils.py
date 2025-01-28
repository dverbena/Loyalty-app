import qrcode
from io import BytesIO
from functools import wraps
from flask import request, jsonify
import jwt
from app.models import User
from app.database import get_db
import os

def generate_qr_code(data: str) -> BytesIO:
    """
    Generate a QR code from a given string.

    Args:
        data (str): The string to encode in the QR code.

    Returns:
        BytesIO: A BytesIO object containing the QR code image in PNG format.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    img_io = BytesIO()
    img.save(img_io, format="PNG")
    img_io.seek(0)
    return img_io

def get_user_from_token(enabled = True):
    token = request.headers.get("Authorization")

    if not token:
        return jsonify({"error": "Autenticazione mancante"}), 401

    data = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=["HS256"])

    with next(get_db()) as db:
        if enabled:
            current_user = db.query(User).filter((User.id == data["user_id"]) & (User.validated == True)).first()
        else:
            current_user =  db.query(User).filter(User.id == data["user_id"]).first()

    if not current_user:
        raise jwt.InvalidTokenError
    else:
        return current_user

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):  
        try:
            return f(get_user_from_token(True), *args, **kwargs)        
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Accesso scaduto"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Accesso invalido"}), 401
    return decorated

def any_valid_token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):  
        try:
            return f(get_user_from_token(False), *args, **kwargs)        
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Accesso scaduto"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Accesso invalido"}), 401
    return decorated

def parse_int_with_default(value, default=0):
    try:
        return int(value)  # Attempt to parse the string as an integer
    except ValueError:
        return default  # Return the default value if parsing fails
