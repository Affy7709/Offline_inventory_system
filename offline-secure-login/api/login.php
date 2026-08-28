<?php
declare(strict_types=1);
require __DIR__ . '/db.php';
start_secure_session();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(false, 'Method not allowed.');
[$username, $password] = credentials(input());
$stmt = db()->prepare('SELECT id, username, password_hash FROM users WHERE username = :username LIMIT 1');
$stmt->execute(['username' => $username]);
$user = $stmt->fetch();
$hash = hash('sha256', $password);
if (!$user || !hash_equals((string)$user['password_hash'], $hash)) respond(false, 'Incorrect username or password.', null);
session_regenerate_id(true);
$_SESSION['user_id'] = (int)$user['id'];
$_SESSION['username'] = $user['username'];
respond(true, 'Authenticated.', ['user' => ['username' => $user['username']]]);
