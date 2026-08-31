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

    // Security Questions
    $q1 = $u['sec_q1'] ?? null;
    $a1_hash = !empty($u['sec_a1']) ? password_hash(strtolower(trim($u['sec_a1'])), PASSWORD_BCRYPT) : null;
    $q2 = $u['sec_q2'] ?? null;
    $a2_hash = !empty($u['sec_a2']) ? password_hash(strtolower(trim($u['sec_a2'])), PASSWORD_BCRYPT) : null;

    // Encrypt password symmetrically so we can reveal it on 'forgot password'
    $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length('aes-256-cbc'));
    $encrypted = openssl_encrypt($u['password'], 'aes-256-cbc', ENCRYPTION_KEY, 0, $iv);
    $encrypted_pwd = base64_encode($encrypted . '::' . $iv);

    // Upsert
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$u['username']]);
    $existing = $stmt->fetch(PDO::FETCH_ASSOC);

    $salt = bin2hex(random_bytes(16));

    if ($existing) {
        $pdo->prepare("
            UPDATE users
               SET password_hash = ?, role_id = ?, department_id = ?, updated_at = NOW(),
                   sec_q1 = ?, sec_a1_hash = ?, sec_q2 = ?, sec_a2_hash = ?, encrypted_pwd = ?
             WHERE username = ?
        ")->execute([
            $bcryptHash, $u['role_id'], $u['department_id'], 
            $q1, $a1_hash, $q2, $a2_hash, $encrypted_pwd, 
            $u['username']
        ]);
        echo "Updated : {$u['username']}\n";
    } else {
        $pdo->prepare("
            INSERT INTO users (username, password_hash, salt, role_id, department_id, sec_q1, sec_a1_hash, sec_q2, sec_a2_hash, encrypted_pwd)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ")->execute([
            $u['username'], $bcryptHash, $salt, $u['role_id'], $u['department_id'],
            $q1, $a1_hash, $q2, $a2_hash, $encrypted_pwd
        ]);
        echo "Created : {$u['username']}\n";
    }

    // Invalidate any existing sessions for this user
    $pdo->prepare("DELETE FROM user_tokens WHERE user_id = (SELECT id FROM users WHERE username = ?)")
        ->execute([$u['username']]);

    echo "  OK — bcrypt hash stored securely.\n\n";
}

echo "=== Done. Passwords are NOT stored here — only in the DB. ===\n";
