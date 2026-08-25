<?php
declare(strict_types=1);
require __DIR__ . '/db.php';
start_secure_session();
if (empty($_SESSION['user_id'])) respond(false, 'Not authenticated.');
respond(true, 'Authenticated.', ['user' => ['username' => (string)$_SESSION['username']]]);
