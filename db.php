<?php
$config = [];
if (file_exists(__DIR__ . '/config.php')) {
    $config = require __DIR__ . '/config.php';
} elseif (file_exists(__DIR__ . '/config.example.php')) {
    $config = require __DIR__ . '/config.example.php';
}

$host = $config['db_host'] ?? getenv('DB_HOST') ?: '127.0.0.1';
$port = $config['db_port'] ?? getenv('DB_PORT') ?: '5432';
$dbname = $config['db_name'] ?? getenv('DB_NAME') ?: 'inventory_db';
$user = $config['db_user'] ?? getenv('DB_USER') ?: 'postgres';
$password = $config['db_pass'] ?? getenv('DB_PASS') ?: '';

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Ensure user_tokens table exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS user_tokens (
            token VARCHAR(64) PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL
        )
    ");
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    error_log("Database Connection Error: " . $e->getMessage());
    echo json_encode(['error' => 'Database connection unavailable.']);
    exit;
}
