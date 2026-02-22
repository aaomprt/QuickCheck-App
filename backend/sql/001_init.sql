CREATE TABLE service_center (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(20),
    open_time TIME,
    close_time TIME,
    lat DECIMAL(10, 7),
    lng DECIMAL(10, 7)
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    line_id_hash VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100)
);

CREATE TABLE car (
    license_plate VARCHAR(100) PRIMARY KEY,
    chassis_number VARCHAR(50) UNIQUE,
    user_id INTEGER REFERENCES users (id) ON DELETE CASCADE,
    brand VARCHAR(100),
    model VARCHAR(100),
    year INT,
    province VARCHAR(50),
    service_center_id INTEGER REFERENCES service_center (id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE part_master (
    part_number VARCHAR(50) PRIMARY KEY,
    part_type VARCHAR(30) NOT NULL,
    model VARCHAR(30) NOT NULL,
    year INT,
    price DECIMAL(10, 2)
);

CREATE TABLE history (
    id BIGSERIAL PRIMARY KEY,
    created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    license_plate VARCHAR(100) NOT NULL REFERENCES car (license_plate) ON DELETE CASCADE
);

CREATE TABLE history_items (
    id BIGSERIAL PRIMARY KEY,
    history_id BIGINT NOT NULL REFERENCES history (id) ON DELETE CASCADE,
    part_number VARCHAR(50) NOT NULL REFERENCES part_master (part_number) ON DELETE RESTRICT,
    damage_level VARCHAR(20) NOT NULL,
    image_path TEXT
);