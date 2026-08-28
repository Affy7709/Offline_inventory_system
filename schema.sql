-- ============================================================
--  Invendor — Complete Secure Schema
--  Auth: SHA-256 (client-side) + bcrypt (server-side)
--  Session: ONE active session per user (single-device lock)
--  Audit: full trail on every action (who, what, when, device)
-- ============================================================

DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS subcategories CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS user_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS departments CASCADE;

CREATE TABLE roles (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE departments (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- password_hash = bcrypt( sha256_hex(plaintext) )
-- salt is stored per-user and prepended on client before sha256
CREATE TABLE users (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(50)  UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    salt            VARCHAR(64)  NOT NULL,
    role_id         INTEGER REFERENCES roles(id),
    department_id   INTEGER REFERENCES departments(id),
    is_active       BOOLEAN   DEFAULT TRUE,
    failed_attempts INTEGER   DEFAULT 0,
    locked_until    TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
    id   SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE subcategories (
    id          SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    UNIQUE (category_id, name)
);

CREATE TABLE products (
    id              SERIAL PRIMARY KEY,
    subcategory_id  INTEGER REFERENCES subcategories(id) ON DELETE SET NULL,
    name            VARCHAR(150) NOT NULL,
    sku             VARCHAR(50)  UNIQUE NOT NULL,
    barcode         VARCHAR(100) UNIQUE,
    min_stock_level INTEGER DEFAULT 5,
    current_stock   INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- UNIQUE(user_id) = only ONE active session per user at a time
CREATE TABLE user_tokens (
    token              VARCHAR(128) PRIMARY KEY,
    user_id            INTEGER REFERENCES users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(64)  NOT NULL,
    ip_address         VARCHAR(45)  NOT NULL,
    user_agent         TEXT,
    created_at         TIMESTAMP DEFAULT NOW(),
    last_seen          TIMESTAMP DEFAULT NOW(),
    expires_at         TIMESTAMP NOT NULL,
    UNIQUE (user_id)
);

CREATE TABLE transactions (
    id               SERIAL PRIMARY KEY,
    product_id       INTEGER REFERENCES products(id) ON DELETE CASCADE,
    user_id          INTEGER REFERENCES users(id) ON DELETE SET NULL,
    department_id    INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    type             VARCHAR(20) CHECK (type IN ('issue','return','add','remove')),
    quantity         INTEGER NOT NULL,
    old_stock        INTEGER,
    new_stock        INTEGER,
    transaction_date TIMESTAMP DEFAULT NOW(),
    notes            TEXT
);

-- Rich audit: every action + device info + before/after values
CREATE TABLE audit_logs (
    id                 SERIAL PRIMARY KEY,
    user_id            INTEGER REFERENCES users(id) ON DELETE SET NULL,
    username           VARCHAR(50),
    action             VARCHAR(255) NOT NULL,
    entity             VARCHAR(100),
    entity_id          INTEGER,
    old_value          TEXT,
    new_value          TEXT,
    ip_address         VARCHAR(45),
    device_fingerprint VARCHAR(64),
    timestamp          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tokens_user    ON user_tokens(user_id);
CREATE INDEX idx_tokens_expires ON user_tokens(expires_at);
CREATE INDEX idx_audit_user     ON audit_logs(user_id);
CREATE INDEX idx_audit_ts       ON audit_logs(timestamp DESC);
CREATE INDEX idx_tx_date        ON transactions(transaction_date DESC);

-- Roles & departments (passwords set via seed_users.php)
INSERT INTO roles (name) VALUES ('Admin'),('Manager'),('Staff'),('Viewer');
INSERT INTO departments (name) VALUES ('IT'),('HR'),('Operations'),('Sales');
