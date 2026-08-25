<?php
declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_NAME = 'offline_auth';
const DB_USER = 'root';
const DB_PASS = '';

function db(): PDO {
    static $connection;
    if ($connection instanceof PDO) return $connection;
    try {
        $connection = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
        return $connection;
    } catch (PDOException $error) {
        http_response_code(503);
        respond(false, 'The local database is unavailable.');
    }
}

function start_secure_session(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off']);
    session_start();
}

function respond(bool $success, string $message, ?array $extra = null): never {
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $extra ?? []));
    exit;
}

function input(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}

function credentials(array $data): array {
    $username = trim((string)($data['username'] ?? ''));
    $password = (string)($data['password'] ?? '');
    if (!preg_match('/^[A-Za-z0-9_.-]{3,32}$/', $username) || strlen($password) < 8 || strlen($password) > 128) {
        respond(false, 'Enter a valid username and password.');
    }
    return [$username, $password];
}
