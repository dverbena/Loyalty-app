from flask import Blueprint, request, jsonify
from pydantic import ValidationError
import logging
from app.database import *
from app.crud import *
from app.models import *
from app.utils import token_required

# Initialize logger
logger = logging.getLogger(__name__)

bp = Blueprint('programs', __name__, url_prefix='/programs')

@bp.route("/all", methods=["GET"])
@token_required
def list_programs(current_user):
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
@token_required
def list_current_programs(current_user):
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
@token_required
def get_program_by_id(current_user, id):    
    logger.info(f"Fetching info for program_id: {id}")

    db = next(get_db())
    program = db.query(Program).filter(Program.id == id).first()
    
    if not program:
        logger.warning(f"Program with id {id} not found.")
        return jsonify({}), 404
    
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
@token_required
def get_customer_by_id(current_user, id):    
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
@token_required
def create_new_program(current_user):
    logger.info("Received request to create a new reward program.")

    try:
        data = ProgramCreateEditRequest(**request.get_json())  # Validate request body using Pydantic
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
    
@bp.route("/<int:id>", methods=["DELETE"])
@token_required
def delete_program(current_user, id):
    """
    Delete a program by ID.
    
    Args:
        id (int): The ID of the program to be deleted.
    
    Returns:
        JSON response indicating success or failure.
    """
    logger.info(f"Received request to delete program with ID: {id}")

    db = next(get_db())
    program = db.query(Program).filter(Program.id == id).first()

    if program.customers:  # If there are customers associated with this program
        logger.warning(f"Program with ID {id} has customers associated to it and cannot be deleted.")
        return jsonify({"error": "Il programma non puó essere cancellato perché in uso da uno o piú soci"}), 404

    if not program:
        logger.warning(f"Program with ID {id} not found.")
        return jsonify({"error": "Programma non trovato"}), 404

    try:
        db.delete(program)
        db.commit()
        logger.info(f"Program with ID {id} deleted successfully.")
        
        return jsonify(
            {
                "message": f"Program with ID {id} has been deleted.",
                "program": 
                { 
                    "name": f"{program.name}"
                }
            }), 200

    except Exception as e:
        logger.error(f"Error occurred while deleting program with ID {id}: {str(e)}")
        db.rollback()
        return jsonify({ "error": f"An error occurred while deleting the program: {str(e)}" }), 500
    
@bp.route("/edit/<int:id>", methods=["PUT"])
@token_required
def edit_program(current_user, id):
    logger.info(f"Received request to edit program with ID: {id}.")

    try:
        data = ProgramCreateEditRequest(**request.get_json())  # Validate request body using Pydantic
        logger.debug(f"Validated program edit data: {data.dict()}")
    except ValidationError as e:
        logger.error(f"Validation error while editing program: {str(e)}")
        return jsonify({
            "error": f"Invalid data provided: {str(e)}"
        }), 400

    try:
        db = next(get_db())

        # Fetch the existing program
        program = db.query(Program).filter(Program.id == id).first()
        if not program:
            logger.error(f"Program with ID {id} not found.")
            return jsonify({"error": f"Program with ID {id} not found."}), 404

        # Update program fields
        program.name = data.name
        program.valid_from = data.valid_from
        program.valid_to = data.valid_to
        program.num_access_to_trigger = data.num_access_to_trigger
        program.num_accesses_reward = data.num_accesses_reward

        # Commit changes to the database
        db.commit()
        logger.info(f"Updated program with ID: {program.id}")

        return jsonify({
            "id": program.id,
            "name": program.name,
            "valid_from": program.valid_from,
            "valid_to": program.valid_to,
            "num_access_to_trigger": program.num_access_to_trigger,
            "num_accesses_reward": program.num_accesses_reward,
            "created_at": program.created_at
        }), 200

    except Exception as e:
        logger.error(f"Error while editing program: {str(e)}")
        return jsonify({
            "error": f"An unexpected error occurred while editing the program: {str(e)}"
        }), 500