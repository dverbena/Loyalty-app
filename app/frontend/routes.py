from flask import Blueprint, render_template, request, jsonify
import requests
import os
import logging
import time
from app.utils import token_required

# Initialize logger
logger = logging.getLogger(__name__)

bp = Blueprint('frontend', __name__, template_folder='templates', static_folder=os.path.join(os.path.dirname(__file__), 'static'), static_url_path='/frontend/static')

# Define the backend API URL
port = os.getenv("FLASK_PORT", 5000)
BACKEND_API_URL = f'http://localhost:{int(port)}'

app_title = os.getenv("APP_TITLE", "APP title")
theme_color = os.getenv("THEME_COLOR", "#ffffff")  # Default to white if not set

# Serve the SPA at the root URL
@bp.route('/')
def serve_spa():    
    # Serve the main entry point for the SPA
    return render_template("index.html", theme_color=theme_color, app_title=app_title, time=int(time.time()))

# Admin page handler (example of backend interaction)
@bp.route('/new_customer', methods=['GET', 'POST'])
@token_required
def new_customer(current_user):
    # if request.method == 'POST':
    #     name = request.form['name']
    #     last_name = request.form['last_name']
    #     email = request.form['email']
    #     address = request.form['address']

    #     # Make a request to the backend API to create a new customer
    #     response = requests.post(
    #         f'{BACKEND_API_URL}/customers/add',
    #         json={'name': name, 'last_name': last_name, 'email': email, 'address': address}
    #     )

    #     if response.status_code == 201:
    #         return jsonify({'message': 'Customer created successfully!'}), 200
    #     else:
    #         return jsonify({'error': 'Error creating customer. Please try again.'}), 500

    return render_template('new_customer.html')

# Customers search handler
@bp.route('/customers')
@token_required
def customers(current_user):        
    return render_template('customers.html')

# Programs search handler
@bp.route('/programs')
@token_required
def programs(current_user):
    return render_template('programs.html')

@bp.route('/scan')
@token_required
def scan(current_user):
    return render_template('scan.html')

@bp.route('/new_program')
@token_required
def new_program(current_user):
    return render_template('new_program.html')

@bp.route('/login')
def login():
    return render_template('login.html')

@bp.route('/profile')
@token_required
def profile(current_user):
    return render_template('profile.html', user=current_user)