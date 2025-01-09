from flask import Blueprint, request, jsonify
from pydantic import ValidationError
import logging
from app.database import *
from app.crud import *
from app.models import *

# Initialize logger
logger = logging.getLogger(__name__)

bp = Blueprint('programs', __name__, url_prefix='/programs')

@bp.route("/all", methods=["GET"])
def list_programs():
    logger.info("Received request to list all programs.")

    db = next(get_db())
    programs = get_programs(db)
    
    logger.debug(f"Fetched {len(programs)} programs from the database.")

    return jsonify([{
        "id": program.id,
        "name": program.name,
        "valid_from": program.valid_from,
        "valid_to": program.valid_to,
        "num_access_to_trigger": program.num_access_to_trigger,
        "num_accesses_reward": program.num_accesses_reward,
        "created_at": program.created_at
    } for program in programs])

@bp.route("/current", methods=["GET"])
def list_current_programs():
    logger.info("Received request to list all current programs.")

    db = next(get_db())
    programs = get_current_programs(db)
    
    logger.debug(f"Fetched {len(programs)} current programs from the database.")

    return jsonify([{
        "id": program.id,
        "name": program.name,
        "valid_from": program.valid_from,
        "valid_to": program.valid_to,
        "num_access_to_trigger": program.num_access_to_trigger,
        "num_accesses_reward": program.num_accesses_reward,
        "created_at": program.created_at
    } for program in programs])
    
@bp.route('/<int:id>', methods=['GET'])
def get_program_by_id(id):    
    logger.info(f"Fetching info for program_id: {id}")

    db = next(get_db())
    program = db.query(Program).filter(Program.id == id).first()
    
    if not program:
        logger.warning(f"Program with id {id} not found.")
        return jsonify({"error": "Program not found"}), 404
    
    logger.info(f"Found program: {program.name}")

    return jsonify({
        "id": program.id,
        "name": program.name,
        "valid_from": program.valid_from,
        "valid_to": program.valid_to,
        "num_access_to_trigger": program.num_access_to_trigger,
        "num_accesses_reward": program.num_accesses_reward,
        "created_at": program.created_at
    }), 200

@bp.route('/customer/<int:id>', methods=['GET'])
def get_customer_by_id(id):    
    logger.info(f"Fetching programs for customer id: {id}")

    db = next(get_db())
    programs = db.query(Program).join(
        Program.customers
    ).filter(Customer.id == id).all()
    
    logger.info(f"Found {len(programs)} for customer {id}")

    return jsonify([{
        "id": program.id,
        "name": program.name,
        "valid_from": program.valid_from,
        "valid_to": program.valid_to,
        "num_access_to_trigger": program.num_access_to_trigger,
        "num_accesses_reward": program.num_accesses_reward,
        "created_at": program.created_at
    } for program in programs]), 200

@bp.route("/add", methods=["POST"])
def create_new_program():
    logger.info("Received request to create a new reward program.")

    try:
        data = ProgramCreateRequest(**request.get_json())  # Validate request body using Pydantic
        logger.debug(f"Validated program creation data: {data.dict()}")
    except ValidationError as e:
        logger.error(f"Validation error while creating program: {str(e)}")
        return jsonify({"error": str(e)}), 400

    db = next(get_db())
    program = create_program(db, data.name, data.valid_from, data.valid_to, data.num_access_to_trigger, data.num_accesses_reward)

    logger.info(f"Created new program with ID: {program.id}, Name: {program.name}")

    return jsonify({
        "id": program.id,
        "name": program.name,
        "valid_from": program.valid_from,
        "valid_to": program.valid_to,
        "num_access_to_trigger": program.num_access_to_trigger,
        "num_accesses_reward": program.num_accesses_reward,
        "created_at": program.created_at
    }), 201
