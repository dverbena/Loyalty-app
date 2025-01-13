from flask import Flask
from app.database import init_db  # Import the database initialization function
from app.routes import customers, accesses, programs, users
from app.frontend import routes as frontend_routes
from datetime import datetime
import logging
import os
from app.models import User
from werkzeug.security import generate_password_hash

def format_db_date(value: str, date_format: str = '%d/%m/%Y'):
    # Convert string to datetime object and return the formatted date
    date_obj = datetime.strptime(value, '%a, %d %b %Y %H:%M:%S GMT')
    return date_obj.strftime(date_format)

# Register the filter with your Jinja2 environment

def create_app():
    app = Flask(__name__)    
    app.secret_key = os.getenv("SECRET_KEY", "default")

    if len(app.secret_key) < 32:
        raise ValueError("SECRET_KEY must be at least 32 characters long!")

    # Configure logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
    
    logging.basicConfig(
        level=LOG_LEVEL,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.StreamHandler(),  # Logs to console
        ]
    )

    logger = logging.getLogger(__name__)
    logger.info(f"Logging initialized at {LOG_LEVEL} level.")

    # Initialize the database
    init_db(app)
    logger.info("Database initialized.")

    # Create the admin user if it doesn't exist
    with app.app_context():
        from app.database import get_db
        
        db = next(get_db())
        admin_user = db.query(User).filter(User.username == "admin").first()

        if admin_user is None:
            # If no admin user exists, create one
            hashed_password = generate_password_hash("changeme")
            admin_user = User(username="admin", password=hashed_password)
            db.add(admin_user)
            db.commit()
            logger.info("Admin user created with username 'admin'.")

    # Register blueprints (routes)
    app.register_blueprint(customers.bp)
    app.register_blueprint(accesses.bp)
    app.register_blueprint(programs.bp)
    app.register_blueprint(frontend_routes.bp)    
    app.register_blueprint(users.bp)  
    
    app.secret_key = os.urandom(24)
    app.config['DEBUG'] = True
    
    app.jinja_env.filters['format_date'] = format_db_date

    return app
