<?php
require __DIR__ . '/db.php';

$users = [
    [
        'username' => 'admin',
        'password' => 'password',
        'role_id' => 1,
        'department_id' => 1
    ],
    [
        'username' => 'manager',
        'password' => 'password',
        'role_id' => 2,
        'department_id' => 3
    ],
    [
        'username' => 'staff',
        'password' => 'password',
        'role_id' => 3,
        'department_id' => 4
    ]
];

echo "Seeding user accounts...\n";

foreach ($users as $u) {
    $hash = password_hash($u['password'], PASSWORD_DEFAULT);
    
    // Check if user exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$u['username']]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $update = $pdo->prepare("UPDATE users SET password_hash = ?, role_id = ?, department_id = ? WHERE username = ?");
        $update->execute([$hash, $u['role_id'], $u['department_id'], $u['username']]);
        echo "Updated existing user: {$u['username']}\n";
    } else {
        $insert = $pdo->prepare("INSERT INTO users (username, password_hash, role_id, department_id) VALUES (?, ?, ?, ?)");
        $insert->execute([$u['username'], $hash, $u['role_id'], $u['department_id']]);
        echo "Created new user: {$u['username']}\n";
    }
}

echo "Done!\n";
