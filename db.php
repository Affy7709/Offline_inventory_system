<?php
// ================================================================
//  db.php — Database bootstrap
//  Auto-migrates new columns/tables if schema was already deployed
// ================================================================

$config = [];
if (file_exists(__DIR__ . '/config.php')) {
    $config = require __DIR__ . '/config.php';
} elseif (file_exists(__DIR__ . '/config.example.php')) {
    $config = require __DIR__ . '/config.example.php';
}

$host     = $config['db_host'] ?? getenv('DB_HOST') ?: '127.0.0.1';
$port     = $config['db_port'] ?? getenv('DB_PORT') ?: '5432';
$dbname   = $config['db_name'] ?? getenv('DB_NAME') ?: 'inventory_db';
$dbuser   = $config['db_user'] ?? getenv('DB_USER') ?: 'postgres';
$dbpass   = $config['db_pass'] ?? getenv('DB_PASS') ?: '';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $dbuser, $dbpass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // ── Auto-migrate: ensure all required columns/tables exist ──

    // users: salt + security columns
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS salt VARCHAR(64) NOT NULL DEFAULT ''");
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE");
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_attempts INTEGER DEFAULT 0");
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP");
    $pdo->exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()");

    // user_tokens: device tracking + single-device enforcement
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_tokens (
            token              VARCHAR(128) PRIMARY KEY,
            user_id            INTEGER REFERENCES users(id) ON DELETE CASCADE,
            device_fingerprint VARCHAR(64)  NOT NULL DEFAULT '',
            ip_address         VARCHAR(45)  NOT NULL DEFAULT '',
            user_agent         TEXT,
            created_at         TIMESTAMP DEFAULT NOW(),
            last_seen          TIMESTAMP DEFAULT NOW(),
            expires_at         TIMESTAMP NOT NULL
        )
    ");
    $pdo->exec("ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(64) NOT NULL DEFAULT ''");
    $pdo->exec("ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45) NOT NULL DEFAULT ''");
    $pdo->exec("ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS user_agent TEXT");
    $pdo->exec("ALTER TABLE user_tokens ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP DEFAULT NOW()");

    // Unique constraint on user_id (one session per user)
    $pdo->exec("
        DO \$\$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'user_tokens_user_id_key'
            ) THEN
                ALTER TABLE user_tokens ADD CONSTRAINT user_tokens_user_id_key UNIQUE (user_id);
            END IF;
        END \$\$;
    ");

    // transactions: stock snapshot columns
    $pdo->exec("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS old_stock INTEGER");
    $pdo->exec("ALTER TABLE transactions ADD COLUMN IF NOT EXISTS new_stock INTEGER");

    // audit_logs: rich columns
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS audit_logs (
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
        )
    ");
    $pdo->exec("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS username VARCHAR(50)");
    $pdo->exec("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity VARCHAR(100)");
    $pdo->exec("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id INTEGER");
    $pdo->exec("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value TEXT");
    $pdo->exec("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value TEXT");
    $pdo->exec("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45)");
    $pdo->exec("ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device_fingerprint VARCHAR(64)");

} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    error_log("DB Error: " . $e->getMessage());
    echo json_encode(['error' => 'Database connection unavailable.']);
    exit;
}
