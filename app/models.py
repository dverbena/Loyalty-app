from sqlalchemy import *
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, date, timezone
from pydantic import BaseModel, Field
from typing import Optional
import uuid

Base = declarative_base()

customer_program = Table(
    'customer_program',
    Base.metadata,
    Column('customer_id', Integer, ForeignKey('customers.id', ondelete="CASCADE"), primary_key=True),
    Column('program_id', Integer, ForeignKey('programs.id', ondelete="RESTRICT"), primary_key=True)
)

class Customer(Base):
    __tablename__ = 'customers'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    address = Column(String(256), nullable=True)
    qr_code = Column(String(255), unique=True, nullable=False)
    created_at = Column(TIMESTAMP, server_default='CURRENT_TIMESTAMP')

    # Relationships
    access_logs = relationship(
        "AccessLog", 
        back_populates="customer",
        cascade='all, delete-orphan'
    )
    
    programs = relationship(
        "Program",
        secondary = customer_program,
        back_populates ="customers",
        cascade="save-update, merge, refresh-expire",
        single_parent=True  # Add this flag to ensure each Program is linked to a single Customer    
    )

    def __init__(self, name, last_name, email, address=None):
        self.name = name
        self.last_name = last_name
        self.email = email
        self.address = address
        self.qr_code = str(uuid.uuid4())  # Generate a unique QR code

class AccessLog(Base):
    __tablename__ = "access_logs"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id", ondelete="CASCADE"), nullable=False)
    is_imported = Column(Boolean, nullable=False, default=True)
    is_reward = Column(Boolean, nullable=False, default=True)
    access_time = Column(DateTime, default=datetime.now(timezone.utc))

    # Establish relationship to Customer
    customer = relationship(
        "Customer", 
        back_populates="access_logs",
        cascade='delete, delete-orphan',
        single_parent=True  # Add this flag to ensure each Program is linked to a single Customer    
    )

class Program(Base):
    __tablename__ = 'programs'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    valid_from = Column(Date, nullable=False)
    valid_to = Column(Date, nullable=False)
    num_access_to_trigger = Column(Integer, nullable=False)
    num_accesses_reward = Column(Integer, nullable=False)
    created_at = Column(TIMESTAMP, server_default='CURRENT_TIMESTAMP')

    customers = relationship(
        "Customer",
        secondary=customer_program,
        back_populates="programs" #,        cascade="save-update, merge, refresh-expire"
    )

    def __init__(self, name, valid_from, valid_to, num_access_to_trigger, num_accesses_reward):
        self.name = name
        self.valid_from = valid_from
        self.valid_to = valid_to
        self.num_access_to_trigger = num_access_to_trigger
        self.num_accesses_reward = num_accesses_reward

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, nullable=False)
    password = Column(String(200), nullable=False)
    created_at = Column(DateTime, server_default='CURRENT_TIMESTAMP')
    email = Column(String(255), nullable=True)
    validated = Column(Boolean, nullable=True)
    
    def validate_postgres_boolean(self, value):
        true_values = {'t', 'true', 'y', 'yes', '1', True, 1}
        
        # Normalize strings to lowercase
        if isinstance(value, str):
            value = value.strip().lower()
        
        if value in true_values:
            return True
        else:
            return False
    
    def __init__(self, username, password, email, validated):
        self.username = username
        self.password = password
        self.email = email
        self.validated = self.validate_postgres_boolean(validated)

# Define Pydantic models for request data validation
class IDQuery(BaseModel):
    id: int = Field(..., description="ID")

class CustomerSearchQuery(BaseModel):
    name: Optional[str] = Field(None, description="Name of the customer")
    last_name: Optional[str] = Field(None, description="Last name of the customer")

class CustomerCreateEditRequest(BaseModel):
    name: str = Field(..., description="Name of the customer")
    last_name: str = Field(..., description="Last name of the customer")
    email: str = Field(..., description="Email address of the customer")
    address: Optional[str] = Field(None, description="Address of the customer")
    programs: Optional[list[int]] = Field(None, description="List of program IDs")
    access_import: Optional[int] = Field(0, description="Number of accesses to be imported from paper or previous systems")

class QRCodeRequest(BaseModel):
    qr_code: str = Field(..., min_length=1, max_length=256, description="QR code of the customer")
    
class LogAccessRequest(BaseModel):
    id: Optional[int] = Field(None, description="Customer's id")
    qr_code: Optional[str] = Field(None, min_length=1, max_length=256, description="QR code of the customer")
    imported: Optional[bool] = Field(None, description="Whether this is a 'fake' access used to keep track of data imported from paper or previous systems")
    reward: bool = Field(..., description="Whether this is a reward access")

class ProgramCreateEditRequest(BaseModel):
    name: str = Field(..., description="Name of the reward program")
    valid_from: date = Field(..., description="Reward programs start of validity")
    valid_to: date = Field(..., description="Reward programs end of validity")
    num_access_to_trigger: int = Field(..., description="Number of accesses needed to get a reward")
    num_accesses_reward: int = Field(..., description="Number of reward accesses")

class UserRequest(BaseModel):
    username: str = Field(..., description="Username", min_length=3)
    password: str = Field(..., description="User password", min_length=8)

class PasswordRequest(BaseModel):    
    password: str = Field(..., description="User password", min_length=8)

class EmailRequest(BaseModel):    
    email: str = Field(..., description="User email", min_length=5)

class OTPRequest(BaseModel):    
    otp: str = Field(..., description="User email", min_length=6, max_length=6)