from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.models import *
from app.utils import generate_qr_code
from datetime import datetime
import qrcode  # For generating QR codes
import os

def create_customer(db: Session, name: str, last_name: str, email: str, address: str = None):
    # Ensure the static/qrcodes directory exists
    qr_code_dir = "static/qrcodes"
    if not os.path.exists(qr_code_dir):
        os.makedirs(qr_code_dir)
    
    try:
        # Start transaction
        db_customer = Customer(name=name, last_name=last_name, email=email, address=address)
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)

        # Generate QR code for the new customer
        img = qrcode.make(db_customer.qr_code)
        qr_code_path = generate_qr_code(db_customer.qr_code)
        img.save(qr_code_path)  # Save the QR code as an image

        return db_customer

    except (OSError, SQLAlchemyError) as e:
        # Rollback transaction in case of error
        db.rollback()

        # Clean up any partial changes
        print(f"Error: {e}")
        raise e

def get_customers(db: Session, skip: int = 0, limit: int = 10):
    return db.query(Customer).offset(skip).limit(limit).all()

def log_access(db: Session, identifier):
    # Find the customer
    if isinstance(identifier, str):
        # Treat it as a QR code
        customer = db.query(Customer).filter(Customer.qr_code == identifier).first()
    elif isinstance(identifier, int):
        # Treat it as an ID
        customer = db.query(Customer).filter(Customer.id == identifier).first()
    else:
        raise TypeError("identifier must be a string (QR code) or an integer (ID)")
    
    if not customer:
        return None  # Customer not found

    # Log the access
    access_log = AccessLog(customer_id=customer.id, access_time=datetime.now())
    db.add(access_log)
    db.commit()
    db.refresh(access_log)

    return customer  # Return customer details for confirmation

def get_access_logs(db: Session, customer_id: int = None):
    query = db.query(AccessLog)

    if customer_id:
        query = query.filter(AccessLog.customer_id == customer_id)

    return query.order_by(AccessLog.access_time.desc()).all()

def get_programs(db: Session, skip: int = 0, limit: int = 10):
    return db.query(Program).offset(skip).limit(limit).all()

def create_program(db: Session, name: str, valid_from: date, valid_to: date, num_access_to_trigger: int, num_accesses_reward: int):
    try:
        # Start transaction
        db_program = Program(name=name, valid_from=valid_from, valid_to=valid_to, num_access_to_trigger=num_access_to_trigger, num_accesses_reward=num_accesses_reward)
        db.add(db_program)
        db.commit()
        db.refresh(db_program)

        return db_program

    except (OSError, SQLAlchemyError) as e:
        # Rollback transaction in case of error
        db.rollback()

        # Clean up any partial changes
        print(f"Error: {e}")
        raise e