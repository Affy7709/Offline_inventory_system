<?php
// ================================================================
//  seed_credentials.example.php — SAFE TO COMMIT
//
//  This is the template. Copy it to seed_credentials.php,
//  fill in real passwords, then run:  php seed_users.php
//
//  seed_credentials.php is in .gitignore — never committed.
// ================================================================

return [
    [
        'username'      => 'admin',
        'password'      => 'CHANGE_ME_strong_password_1',
        'role_id'       => 1,   // Admin
        'department_id' => 1,   // IT
    ],
    [
        'username'      => 'manager',
        'password'      => 'CHANGE_ME_strong_password_2',
        'role_id'       => 2,   // Manager
        'department_id' => 3,   // Operations
    ],
    [
        'username'      => 'staff1',
        'password'      => 'CHANGE_ME_strong_password_3',
        'role_id'       => 3,   // Staff
        'department_id' => 4,   // Sales
    ],
    [
        'username'      => 'staff2',
        'password'      => 'CHANGE_ME_strong_password_4',
        'role_id'       => 3,   // Staff
        'department_id' => 2,   // HR
    ],
];
