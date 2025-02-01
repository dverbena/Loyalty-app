from flask import Blueprint, request, jsonify, session
from pydantic import ValidationError
import logging
from app.models import *
from app.database import *
from app.utils import token_required, any_valid_token_required
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone, timedelta
import jwt
import os
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from smtplib import SMTP
import random
from app.utils import parse_int_with_default

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

    with next(get_db()) as db:
        existing_user = db.query(User).filter(User.username == data.username).first()

    if existing_user:
        return jsonify({"error": "Utenza già esistente"}), 400

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
    # Log the start of the request processing
    logger.info("Received request to login a user")

    data = request.get_json()

    username = data.get('username')
    password = data.get('password')

    with next(get_db()) as db:
        user = db.query(User).filter(User.username == username).first()

    if not user or not check_password_hash(user.password, password):
        return jsonify({"error": "Credenziali non valide"}), 401

    token = jwt.encode(
        {
            "user_id": user.id,
            "exp": datetime.now(timezone.utc) + timedelta(days=1),
        },
        os.getenv("SECRET_KEY"),
        algorithm="HS256",
    )
    return jsonify({"validated": user.validated, "token": token})

@bp.route('/password_update', methods=['PUT'])
@any_valid_token_required
def update_password(current_user):
    try:
        # Log the start of the request processing
        logger.info(f"Received request to update password for user {current_user.username}")

        # Validate the input data using Pydantic
        data = PasswordRequest(**request.get_json())
        logger.debug(f"Validated input data: {data.dict()}")

    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")  # Log the validation error
        return jsonify({"error": str(e)}), 400    

    with next(get_db()) as db:
        existing_user = db.query(User).filter(User.id == current_user.id).first()

        if not existing_user:
            return jsonify({"error": "Utenza inesistente"}), 400
        
        existing_user.password = generate_password_hash(data.password)

        db.commit()

        logger.info(f"User password updated: {existing_user.username}")

    # Return customer details if access is logged
    return jsonify({
        "message": f"Password aggiornata per l'utente {existing_user.username}"
    }), 200

def send_email(to_email, OTP, isValidation):
    smtp_server = os.getenv("SMTP_SERVER")
    smtp_port = parse_int_with_default(os.getenv("SMTP_PORT", 587), 587)
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender_email = os.getenv("SMTP_SENDER_EMAIL", smtp_user)

    if not all([smtp_server, smtp_port, smtp_user, smtp_password, sender_email]):
        raise ValueError("Configurazione SMTP mancante o errata")

    # Construct the email
    message = MIMEMultipart("related")
    message["From"] = sender_email
    message["To"] = to_email
    message["Subject"] = "Codice OTP"

    # Add the HTML body
    msg_alternative = MIMEMultipart("alternative")
    message.attach(msg_alternative)

    # Embed the inline image using CID
    cid = "logo"
    html_body = f"""
        <div style="text-align: center;">
            <img src="cid:{cid}" alt="Logo" width="398" height="398">
            <div style="font-size: 24px; font-family: 'Google Sans', Roboto, Arial, sans-serif; line-height: 32px; margin-top: 24px;">
                <div>Di sequito il questo codice per validare l'utenza creata/modificata; questo codice sará valido per 5 minuti.</div>
                <div style="text-align: center; font-size: 1.5em; margin-top: 30px">{OTP}</div>
            </div>
                
        </div>
        """ if isValidation else f"""
        <div style="text-align: center;">
            <img src="cid:{cid}" alt="Logo" width="398" height="398">
            <div style="font-size: 24px; font-family: 'Google Sans', Roboto, Arial, sans-serif; line-height: 32px; margin-top: 24px;">
                <div>Di sequito il questo codice per reimpostare la password amministrativa; questo codice sará valido per 5 minuti.</div>
                <div style="text-align: center; font-size: 1.5em; margin-top: 30px">{OTP}</div>
            </div>
                
        </div>
        """

    msg_alternative.attach(MIMEText(html_body, "html"))

    # Attach the inline image
    with open("/app/frontend/static/logo/logo.png", "rb") as img:
        img_part = MIMEImage(img.read())
        img_part.add_header("Content-ID", f"<{cid}>")
        img_part.add_header("Content-Disposition", "inline", filename="logo.png")
        message.attach(img_part)

    # Send the email
    with SMTP(smtp_server, smtp_port) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(message)

@bp.route('/send_validate', methods=['POST'])
@any_valid_token_required
def validate_send_email(current_user):
    # Log the start of the request processing
    logger.info(f"Received request to send validation email to user {current_user.username}")# Validate the input data using Pydantic
    
    data = EmailRequest(**request.get_json())
    logger.debug(f"Validated input data: {data.dict()}")
    
    try:
        session['validation_code'] = str(random.randint(100000, 999999))
        session['validation_timestamp'] = datetime.now(timezone.utc)

        if data.email:            
            send_email(data.email, session['validation_code'], True)
        else:
            send_email(current_user.email, session['validation_code'], True)
        
        logger.info(f"Validation email sent out to: {current_user.username}")
    except Exception as e:
        logger.error(f"Error: {str(e)}") 
        return jsonify({"error": str(e)}), 400    

    # Return customer details if access is logged
    return jsonify({
        "message": f"Email di validazione spedita all'utente {current_user.username}"
    }), 200

@bp.route('/send_reset', methods=['POST'])
def reset_send_email():
    # Log the start of the request processing
    logger.info("Received request to send password reset email")    
    
    try:
        session['validation_code'] = str(random.randint(100000, 999999))
        session['validation_timestamp'] = datetime.now(timezone.utc)

        with next(get_db()) as db:
            admin = db.query(User).filter((User.username == 'admin') & (User.validated == True)).first()

        if admin:            
            send_email(admin.email, session['validation_code'], False)
        
        logger.info("Password reset email sent out to admin")
    except Exception as e:
        logger.error(f"Error: {str(e)}") 
        return jsonify({"error": str(e)}), 400    

    # Return customer details if access is logged
    return jsonify({
        "message": "Email per la reimpostazione della password spedita all'utente admin"
    }), 200

def check_code(code):   
    # returns: 0 if matching, 1 if not matching, 2 if expired, 3 if not OTP in session 
    validation_code = session.get('validation_code')
    validation_timestamp = session.get('validation_timestamp')

    if validation_code and validation_timestamp:
        logger.debug(f"session: {validation_code}, request: {code}")

        # Check if the session item is expired
        if datetime.now(timezone.utc) - validation_timestamp > timedelta(minutes=5):
            session.pop('validation_code', None)  # Remove expired session item
            session.pop('validation_timestamp', None)

            return 2
        
        return 0 if validation_code == code else 1
    else:
        return 3

@bp.route('/admin_password_reset', methods=['PUT'])
def reset_admin_password():
    try:
        # Log the start of the request processing
        logger.info("Received request to reset admin password")

        # Validate the input data using Pydantic
        data = OTPRequest(**request.get_json())
        logger.debug(f"Validated input data: {data.dict()}")

    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")  # Log the validation error
        return jsonify({"error": str(e)}), 400  
    
    isValid = check_code(data.otp)

    if isValid == 1:
        return jsonify({"error": "OTP invalido"}), 400

    if isValid == 2:
        return jsonify({"error": "OTP scaduto"}), 400

    if isValid == 3:
        return jsonify({"restart": True, "error": "OTP non trovato, meglio ricominciare da capo :-)"}), 400 
    
    with next(get_db()) as db:
        existing_user = db.query(User).filter(User.username == 'admin').first()

        if not existing_user:
            return jsonify({"error": "Utenza inesistente"}), 400        
        
        existing_user.password = generate_password_hash(os.getenv("DEFAULT_PASSWORD", "changeme"))
        existing_user.validated = False
        
        db.commit()

        session.pop('validation_code', None)  # Remove expired session item
        session.pop('validation_timestamp', None)

        logger.info(f"User validated: {existing_user.username}")

    return jsonify({
        "message": f"Utente {existing_user.username} validato"
    }), 200

@bp.route('/validate', methods=['PUT'])
@any_valid_token_required
def validate(current_user):
    try:
        # Log the start of the request processing
        logger.info(f"Received request to validate user {current_user.username}")

        # Validate the input data using Pydantic
        data = OTPRequest(**request.get_json())
        logger.debug(f"Validated input data: {data.dict()}")

    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")  # Log the validation error
        return jsonify({"error": str(e)}), 400  
    
    isValid = check_code(data.otp)

    if isValid == 1:
        return jsonify({"error": "OTP invalido"}), 400

    if isValid == 2:
        return jsonify({"error": "OTP scaduto"}), 400

    if isValid == 3:
        return jsonify({"restart": True, "error": "OTP non trovato, meglio ricominciare da capo :-)"}), 400 
    
    with next(get_db()) as db:
        existing_user = db.query(User).filter(User.id == current_user.id).first()

        if not existing_user:
            return jsonify({"error": "Utenza inesistente"}), 400
        
        existing_user.validated = True    
        db.commit()

        session.pop('validation_code', None)  # Remove expired session item
        session.pop('validation_timestamp', None)

        logger.info(f"User validated: {existing_user.username}")

    return jsonify({
        "message": f"Utente {existing_user.username} validato"
    }), 200

@bp.route('/email_update', methods=['PUT'])
@any_valid_token_required
def update_email(current_user):
    try:
        # Log the start of the request processing
        logger.info(f"Received request to update email for user {current_user.username}")

        # Validate the input data using Pydantic
        data = EmailRequest(**request.get_json())
        logger.debug(f"Validated input data: {data.dict()}")

    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")  # Log the validation error
        return jsonify({"error": str(e)}), 400    

    with next(get_db()) as db:
        existing_user = db.query(User).filter(User.id == current_user.id).first()

        if not existing_user:
            return jsonify({"error": "Utenza inesistente"}), 400
        
        existing_user.email = data.email        
        db.commit()

        logger.info(f"User email updated: {existing_user.username}")

    # Return customer details if access is logged
    return jsonify({
        "message": f"Email aggioranta per l'utente {existing_user.username}"
    }), 200

@bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):    
    # Log the start of the request processing
    logger.info(f"Received request to logout user {current_user.username}")

    return jsonify({"message": f"Utente sloggato"})
