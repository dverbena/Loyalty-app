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

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("Authorization")

        if not token:
            return jsonify({"message": "Token is missing"}), 401

        try:
            db = next(get_db())
            data = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=["HS256"])
            current_user = db.query(User).filter(User.id == data["user_id"]).first()

            if not current_user:
                raise jwt.InvalidTokenError
            
        except jwt.ExpiredSignatureError:
            return jsonify({"message": "Token has expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"message": "Invalid token"}), 401

        return f(current_user, *args, **kwargs)
    return decorated
