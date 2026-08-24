<?php
// PostgreSQL runs on the same PC, so PHP always talks to it via 127.0.0.1.
// This does NOT need to be the hotspot IP — only the PHP server itself
// needs to be reachable from other devices (see index.php / run instructions).

$host = '127.0.0.1';
$port = '5432';
$dbname = 'inventory_db';
$user = 'postgres';
$password = 'Arfat@7709'; // change this

try {
    $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'DB connection failed: ' . $e->getMessage()]);
    exit;
}
