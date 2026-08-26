<?php
// ================================================================
//  seed_users.php — SAFE TO COMMIT (no passwords inside)
//
//  Passwords are loaded from seed_credentials.php (gitignored).
//  To set up:
//    1. cp seed_credentials.example.php seed_credentials.php
//    2. Edit seed_credentials.php with real passwords
//    3. php seed_users.php
//
//  Authentication flow:
//    Client: sends plaintext password
//    Server: bcrypt( plaintext_password )          → stores hash
// ================================================================

require __DIR__ . '/db.php';

$credFile = __DIR__ . '/seed_credentials.php';
if (!file_exists($credFile)) {
    die(
        "ERROR: seed_credentials.php not found.\n" .
        "Copy seed_credentials.example.php to seed_credentials.php,\n" .
        "fill in the passwords, then run this script again.\n"
    );
}

$users = require $credFile;

echo "=== Invendor Secure User Seeding ===\n\n";

foreach ($users as $u) {
    if (empty($u['password']) || str_starts_with($u['password'], 'CHANGE_ME')) {
        echo "SKIPPED {$u['username']} — placeholder password not changed.\n";
        continue;
    }

    // Standard bcrypt — cost 12
    $bcryptHash = password_hash($u['password'], PASSWORD_BCRYPT, ['cost' => 12]);

    // Upsert
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$u['username']]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($existing) {
        $pdo->prepare("
            UPDATE users
               SET password_hash = ?, role_id = ?, department_id = ?, updated_at = NOW()
             WHERE username = ?
        ")->execute([$bcryptHash, $u['role_id'], $u['department_id'], $u['username']]);
        echo "Updated : {$u['username']}\n";
    } else {
        $pdo->prepare("
            INSERT INTO users (username, password_hash, role_id, department_id)
            VALUES (?, ?, ?, ?)
        ")->execute([$u['username'], $bcryptHash, $u['role_id'], $u['department_id']]);
        echo "Created : {$u['username']}\n";
    }

    // Invalidate any existing sessions for this user
    $pdo->prepare("DELETE FROM user_tokens WHERE user_id = (SELECT id FROM users WHERE username = ?)")
        ->execute([$u['username']]);

    echo "  OK — bcrypt hash stored securely.\n\n";
}

echo "=== Done. Passwords are NOT stored here — only in the DB. ===\n";
