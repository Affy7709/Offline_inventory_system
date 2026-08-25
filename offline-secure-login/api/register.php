<?php
declare(strict_types=1);
require __DIR__ . '/db.php';
start_secure_session();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(false, 'Method not allowed.');
[$username, $password] = credentials(input());
$database = db();
$check = $database->prepare('SELECT id FROM users WHERE username = :username LIMIT 1');
$check->execute(['username' => $username]);
if ($check->fetch()) respond(false, 'That username is already registered.');
$stmt = $database->prepare('INSERT INTO users (username, password_hash) VALUES (:username, :password_hash)');
$stmt->execute(['username' => $username, 'password_hash' => hash('sha256', $password)]);
respond(true, 'Account created.');
