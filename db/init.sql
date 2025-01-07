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
    access_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create programs table
CREATE TABLE IF NOT EXISTS programs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL CHECK (valid_to > valid_from), -- Ensure valid_to is after valid_from
    num_access_to_trigger INT NOT NULL CHECK (num_access_to_trigger > 0), -- Must be > 0
    num_accesses_reward INT NOT NULL CHECK (num_accesses_reward > 0), -- Must be > 0
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create customer_program table for many-to-many relationship
CREATE TABLE IF NOT EXISTS customer_program (
    customer_id INT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    program_id INT NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    PRIMARY KEY (customer_id, program_id)
);

-- Add indexes to improve performance for joins on customer_program
CREATE INDEX IF NOT EXISTS idx_customer_program_customer_id ON customer_program(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_program_program_id ON customer_program(program_id);
