from flask import Blueprint, request, jsonify
from pydantic import BaseModel, Field, ValidationError
import logging
from app.database import *
from app.crud import *
from app.models import *
from app.utils import token_required

# Initialize logger
logger = logging.getLogger(__name__)

bp = Blueprint('accesses', __name__, url_prefix='/accesses')

@bp.route('/add', methods=['POST'])
@token_required
def log_access_endpoint(current_user):
    try:
        # Log the start of the request processing
        logger.info("Received request to log access.")

        # Validate the input data using Pydantic
        data = LogAccessRequest(**request.get_json())
        logger.debug(f"Validated input data: {data.dict()}")

    except ValidationError as e:
        logger.error(f"Validation error: {str(e)}")  # Log the validation error
        return jsonify({"error": str(e)}), 400

    # Ensure at least one parameter is provided
    if not data.id and not data.qr_code:
        logger.error("Neither 'id' nor 'qr_code' was provided.")
        return jsonify({"error": "At least one of 'id' or 'qr_code' must be provided."}), 400

    with next(get_db()) as db:
        if(data.qr_code):
            qr_code = data.qr_code
            logger.info(f"Received QR code: {qr_code}")

            customer = log_access(db, qr_code, data.imported, data.reward)

            if not customer:
                logger.error(f"Invalid QR code: {qr_code}. Customer not found.")
                return jsonify({"error": "Invalid QR code"}), 404
        else:
            id = data.id
            logger.info(f"Received ID: {id}")

            customer = log_access(db, id, data.imported, data.reward)

            if not customer:
                logger.error(f"Invalid ID: {id}. Customer not found.")
                return jsonify({"error": "Invalid customer ID"}), 404

    logger.info(f"Access granted for customer: {customer.name} {customer.last_name}")

    # Return customer details if access is logged
    return jsonify({
        "message": "Access granted",
        "customer": {
            "name": customer.name,
            "last_name": customer.last_name,
            "email": customer.email,
        }
    }), 200
    
@bp.route('/customer/<id>', methods=['GET'])
@token_required
def get_access_logs_endpoint(current_user, id):
    logger.info(f"Fetching accesses for customer_id: {id}")

    with next(get_db()) as db:
        start = int(request.args.get('start', 0))
        length = int(request.args.get('length', 10))
        search_value = request.args.get('search[value]', '').lower()
        order_column_index = int(request.args.get('order[0][column]', 0))
        order_direction = request.args.get('order[0][dir]', 'asc')

        # Define column mapping for ordering
        column_mapping = {
            1: 'access_time'
        }

        order_column = column_mapping.get(order_column_index, 'access_time')

        customer = db.query(Customer).filter(Customer.id == id).first()

        if not customer:
            logger.error(f"Customer not found for ID: {id}")
            return jsonify({"error": "Customer not found"}), 404

        logs = get_access_logs_without_imported(db, id) 

        total_records = logs.count()

        if order_direction == 'desc':
            logs = logs.order_by(getattr(AccessLog, order_column).desc())
        else:
            logs = logs.order_by(getattr(AccessLog, order_column))
        
        logs = logs.offset(start).limit(length).all()
    
        logger.debug(f"Fetched {total_records} accesses for customer_id: {id}")
    
        # Build response
        data = [{
            "id": log.id,
            "customer_id": log.customer_id,
            "imported": log.is_imported,
            "reward": log.is_reward,
            "access_time": log.access_time
        } for log in logs]

        return jsonify({
            "draw": int(request.args.get('draw', 1)),
            "recordsTotal": total_records,
            "recordsFiltered": total_records if not search_value else len(data),
            "data": data
        })  

@bp.route("/customer/qr/<qr_code>", methods=["GET"])
@token_required
def get_access_logs_by_qr(current_user, qr_code):
    logger.info(f"Fetching accesses for QR code: {qr_code}")

    with next(get_db()) as db:
        customer = db.query(Customer).filter(Customer.qr_code == qr_code).first()

    if not customer:
        logger.error(f"Customer not found for QR code: {qr_code}")
        return jsonify({"error": "Customer not found"}), 404

    logs = get_access_logs_without_imported(db, id)
    logger.debug(f"Fetched {len(logs)} accesses for customer with QR code: {qr_code}")

    return jsonify([{
        "id": log.id,
        "customer_id": log.customer_id,
        "imported": log.is_imported,
        "reward": log.is_reward,
        "access_time": log.access_time
    } for log in logs]), 200

@bp.route("/reward_due/<cid>", methods=["GET"])
@token_required
def is_customer_reward_due(current_user, cid):
    logger.info(f"Checking if customer {cid} is due for a reward")

    db = next(get_db())
    reward_due = is_reward_due(db, cid)

    logger.debug(f"Customer {cid} is {'' if reward_due else 'NOT '}due a reward")

    return jsonify({
        "customer_id": cid,
        "reward_due": reward_due.reward_due,
        "program": reward_due.program_name
    }), 200

@bp.route("/reward_due_qr/<qr>", methods=["GET"])
@token_required
def is_customer_reward_due_qr(current_user, qr):
    logger.info(f"Checking if customer {qr} is due for a reward")

    with next(get_db()) as db:
        customer = db.query(Customer).filter(Customer.qr_code == qr).first()

    if not customer:
        logger.error(f"Customer not found for QR code: {qr}")
        return jsonify({"error": "Customer not found"}), 404
    
    reward_due = is_reward_due(db, customer.id)

    logger.debug(f"Customer {qr} is {'' if reward_due else 'NOT '}due a reward")

    return jsonify({
        "customer_id": customer.id,
        "reward_due": reward_due.reward_due,
        "program": reward_due.program_name
    }), 200
