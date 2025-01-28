-- Create user table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) NOT NULL,
    password VARCHAR(200) NOT NULL,
    email VARCHAR(255) UNIQUE NULL,
    validated BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    address VARCHAR(256) NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create access_logs table
CREATE TABLE IF NOT EXISTS access_logs (
    id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES customers(id) ON DELETE CASCADE,
    is_imported BOOLEAN NOT NULL DEFAULT FALSE,
    is_reward BOOLEAN NOT NULL DEFAULT FALSE,
    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create programs table
CREATE TABLE IF NOT EXISTS programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL CHECK (valid_to > valid_from), -- Ensure valid_to is after valid_from
    num_access_to_trigger INT NOT NULL CHECK (num_access_to_trigger > 0), -- Must be > 0
    num_accesses_reward INT NOT NULL CHECK (num_accesses_reward > 0), -- Must be > 0    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customer_program table for many-to-many relationship
CREATE TABLE IF NOT EXISTS customer_program (
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    program_id INT NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
    PRIMARY KEY (customer_id, program_id)
);

-- Add indexes to improve performance for joins on customer_program
CREATE INDEX IF NOT EXISTS idx_customer_program_customer_id ON customer_program(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_program_program_id ON customer_program(program_id);

CREATE OR REPLACE FUNCTION check_program_overlap() 
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the customer is already assigned to a program that overlaps with the new program
    IF EXISTS (
        SELECT 1
        FROM customer_program cpold
        JOIN programs pold ON cpold.program_id = pold.id
        JOIN programs pnew ON NEW.program_id = pnew.id
        WHERE cpold.customer_id = NEW.customer_id
          AND (
              -- Overlap cases:
              -- Case 1: Existing program starts before and ends during the new program
              (pold.valid_from < pnew.valid_to AND pold.valid_to >= pnew.valid_from)
              -- Case 2: Existing program is entirely within the new program
              OR (pold.valid_from >= pnew.valid_from AND pold.valid_to <= pnew.valid_to)
              -- Case 3: Existing program starts during and ends after the new program
              OR (pold.valid_from <= pnew.valid_to AND pold.valid_to > pnew.valid_from)
              -- Case 4: Existing program completely envelops the new program
              OR (pold.valid_from <= pnew.valid_from AND pold.valid_to >= pnew.valid_to)
          )
    ) THEN
        RAISE EXCEPTION 'The customer is already assigned to a program with overlapping dates';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_program_overlap
BEFORE INSERT OR UPDATE ON customer_program
FOR EACH ROW
EXECUTE FUNCTION check_program_overlap();

--INSERT INTO programs (name, valid_from, valid_to, num_access_to_trigger, num_accesses_reward) VALUES 
--('Silver 2025', '2025-01-01', '2025-12-31', 10, 1), 
--('Gold 2025', '2025-01-01', '2025-12-31', 10, 2);

