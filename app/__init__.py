from flask import Flask
from app.database import init_db  # Import the database initialization function
from app.routes import customers, accesses, programs
from app.frontend import routes as frontend_routes
import logging
import os

def create_app():
    app = Flask(__name__)    

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

    # Register blueprints (routes)
    app.register_blueprint(customers.bp)
    app.register_blueprint(accesses.bp)
    app.register_blueprint(programs.bp)
    app.register_blueprint(frontend_routes.bp)  # Register frontend blueprint

    app.secret_key = os.urandom(24)
    app.config['DEBUG'] = True
    
    return app
