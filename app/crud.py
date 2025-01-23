from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError, NoResultFound
from sqlalchemy import and_, extract
from datetime import datetime, timezone
from app.models import *
from app.utils import generate_qr_code
import qrcode  # For generating QR codes
import os
import logging

# Initialize logger
logger = logging.getLogger(__name__)

class RewardDue():    
    def __init__(self, customer_id, program_name, reward_due):
        self.username = customer_id
        self.program_name = program_name
        self.reward_due = reward_due

def add_customer_to_program(db: Session, customer_id: int, program_id: int):
    # Fetch the customer and program from the database    
    with db:
        customer = db.query(Customer).filter(Customer.id == customer_id).one()
        
        if not customer:
            raise Exception(f"Customer {customer_id} not found")
        
        program = db.query(Program).filter(Program.id == program_id).one()
        
        if not program:
            raise Exception(f"Program {program_id} not found")

        # Add the program to the customer (This will insert into the customer_program table)
        customer.programs.append(program)
    
    return customer

def update_customer_programs(db: Session, customer_id: int, program_ids: list[int]):
    # Fetch the customer from the database        
    customer = db.query(Customer).filter(Customer.id == customer_id).one()
    
    if not customer:
        raise Exception(f"Customer {customer_id} not found")
    
    # Fetch the programs based on the provided program_ids and add them to the customer
    programs = db.query(Program).filter(Program.id.in_(program_ids)).all()

    # Ensure the programs exist
    if len(programs) != len(program_ids):
        raise Exception("One or more programs not found")

    # Remove all existing program associations for this customer
    customer.programs.clear()
    
    # Add the new programs to the customer
    customer.programs.extend(programs)

    return customer

def create_customer(db: Session, name: str, last_name: str, email: str, address: str = None, access_import: int = 0, programs: list[int] = []):
    try:        
        # Create the customer
        db_customer = Customer(name=name, last_name=last_name, email=email, address=address)
        db.add(db_customer)
        db.flush()
        
        # If programs are provided, update the customer_program table
        if programs:
            # Call update_customer_programs within the same transaction
            update_customer_programs(db, db_customer.id, programs)

        if access_import > 0:
            for i in range(access_import):
                log_access(db, db_customer.id, True, False, False)
        
        db.commit()
        db.refresh(db_customer)
        
        return db_customer
    except (OSError, SQLAlchemyError) as e:
        # Rollback transaction in case of error
        db.rollback()

        # Clean up any partial changes
        print(f"Error: {e}")
        raise e

def get_customers(db: Session, skip: int = 0, limit: int = 10):
    with db:
        customers = db.query(Customer) #.offset(skip).limit(limit).all()
    
    return customers

def log_access(db: Session, identifier, imported: bool, reward: bool, commit: bool = True):
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
    access_log = AccessLog(customer_id=customer.id, is_imported=imported, is_reward=reward, access_time=datetime.now())
    db.add(access_log)
    
    if commit:
        db.commit()
    
    # Refresh customer to make sure it's attached to the session and up-to-date
    db.refresh(customer)

    return customer  # Return customer details for confirmation

def get_access_logs_without_imported(db: Session, customer_id: int = None):
    with db:
        query = db.query(AccessLog)

        if customer_id:
            query = query.filter((AccessLog.customer_id == customer_id) & (AccessLog.is_imported == False))

    return query.order_by(AccessLog.access_time.desc()).all()

def get_programs(db: Session, skip: int = 0, limit: int = 10):
    with db:
        programs = db.query(Program).order_by(Program.valid_to.desc()) #.offset(skip).limit(limit).all()
    
    return programs

def get_current_programs(db: Session, skip: int = 0, limit: int = 10):
    now = datetime.now().date()
    
    with db:
        programs = db.query(Program).filter(
            and_(
                Program.valid_from <= now,
                Program.valid_to > now
            )).order_by(Program.valid_to.desc()).all()
    
    return programs

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
    
def get_customer_programs_for_current_year(db: Session, customer_id: int):
    # Get the current year
    now = datetime.now(timezone.utc)
    current_year = now.year
    
    # Query to join Customer and Program and filter by customer_id and current year
    # return db_session.query(Customer.name, Customer.last_name, Program.name).join( # using projection
    with db:
        programs = db.query(Program).join(
            Program.customers
        ).filter(
            Customer.id == customer_id,  # Filter by customer_id
            extract('year', Program.valid_from) <= current_year,  # Filter programs valid from the current year
            extract('year', Program.valid_to) >= current_year  # Filter programs valid to the current year
        ).all()

    return programs

def is_reward_due(db: Session, customer_id: int) -> RewardDue:
    # Get the current year
    now = datetime.now(timezone.utc)
    current_year = now.year
    
    with db:
        # Fetch the program details
        programs = get_customer_programs_for_current_year(db, customer_id)
        
        if not programs:
            logger.debug(f"No enrollment in any program found for customer {customer_id} in {current_year}")
            return RewardDue(customer_id, "Nussun programma", False)    
        else:
            program = programs[0]
            logger.debug(f"Program found: {program.name}")

            # Fetch the access logs for the customer in the current year
            access_logs = (
                db.query(AccessLog)
                .filter(
                    AccessLog.customer_id == customer_id,
                    AccessLog.access_time >= datetime(current_year, 1, 1),
                    AccessLog.access_time < datetime(current_year + 1, 1, 1),
                )
                .order_by(AccessLog.access_time)
                .all()
            )
            
    # Calculate the total accesses for the current year
    num_accesses = len(access_logs) + 1 # check if next access is supposed to be a reward 

    if num_accesses == 1: # no access so far, no reward
        return RewardDue(customer_id, program.name, False)    
    else:
        logger.debug(f"Computing access #{num_accesses} for customer id {customer_id} in {current_year}")

        # Check if the customer is due for a reward
        reward_cycle = program.num_access_to_trigger + program.num_accesses_reward  
        reward_due_thresholds = range(0, program.num_accesses_reward, 1)

        for threshold in reward_due_thresholds:
            if (num_accesses + threshold) % reward_cycle == 0:
                return RewardDue(customer_id, program.name, True)  

        return RewardDue(customer_id, program.name, False)    
