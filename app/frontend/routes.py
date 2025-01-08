from flask import Blueprint, render_template, request, jsonify
import requests
import os
import logging

# Initialize logger
logger = logging.getLogger(__name__)

bp = Blueprint('frontend', __name__, template_folder='templates', static_folder=os.path.join(os.path.dirname(__file__), 'static'), static_url_path='/frontend/static')

# Define the backend API URL
port = os.getenv("FLASK_PORT", 5000)
BACKEND_API_URL = f'http://localhost:{int(port)}'

# Serve the SPA at the root URL
@bp.route('/')
def serve_spa():
    # Serve the main entry point for the SPA
    return render_template('index.html')

# Admin page handler (example of backend interaction)
@bp.route('/new_customer', methods=['GET', 'POST'])
def new_customer():
    if request.method == 'POST':
        name = request.form['name']
        last_name = request.form['last_name']
        email = request.form['email']
        address = request.form['address']

        # Make a request to the backend API to create a new customer
        response = requests.post(
            f'{BACKEND_API_URL}/customers/add',
            json={'name': name, 'last_name': last_name, 'email': email, 'address': address}
        )

        if response.status_code == 201:
            return jsonify({'message': 'Customer created successfully!'}), 200
        else:
            return jsonify({'message': 'Error creating customer. Please try again.'}), 500

    return render_template('new_customer.html')

# Customers search handler
@bp.route('/customers')
def customers():
    name = request.args.get('name', '')
    last_name = request.args.get('last_name', '')

    if not name and not last_name:
        response = requests.get(f'{BACKEND_API_URL}/customers/all')
    else:
        response = requests.get(f'{BACKEND_API_URL}/customers/search?name={name}&last_name={last_name}')

    if response.status_code == 200:
        customers = response.json()
    else:
        customers = []
        
    return render_template('customers.html', customers=customers)


# Programs search handler
@bp.route('/programs')
def programs():
    response = requests.get(f'{BACKEND_API_URL}/programs/all')

    if response.status_code == 200:
        programs = response.json()
    else:
        programs = []
        
    logger.debug("Programs data:", customers)

    return render_template('programs.html', programs=programs)

@bp.route('/scan')
def scan():
    return render_template('scan.html')