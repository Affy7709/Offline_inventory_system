<?php
// Disable HTML error output to prevent corrupting API JSON responses
ini_set('display_errors', '0');
error_reporting(E_ALL & ~E_NOTICE & ~E_DEPRECATED);
ob_start();

require __DIR__ . '/db.php';

// ── CORS ──────────────────────────────────────────────────────
$origin = $_SERVER['HTTP_ORIGIN'] ?? '*';
$allowedOrigins = $config['cors_allowed_origins'] ?? '*';

if ($allowedOrigins === '*') {
    header('Access-Control-Allow-Origin: *');
} elseif (is_array($allowedOrigins) && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: ' . (is_string($allowedOrigins) ? $allowedOrigins : '*'));
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Device-Fingerprint');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? '';

// ── Helpers ───────────────────────────────────────────────────

function get_client_ip(): string
{
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'REMOTE_ADDR'] as $k) {
        if (!empty($_SERVER[$k])) {
            return explode(',', $_SERVER[$k])[0];
        }
    }
    return '0.0.0.0';
}

function get_device_fingerprint(): string
{
    // Sent by the React client (SHA-256 of browser fingerprint)
    return substr(trim($_SERVER['HTTP_X_DEVICE_FINGERPRINT'] ?? ''), 0, 64);
}

function get_auth_token(): ?string
{
    $auth = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? (function_exists('apache_request_headers') ? (apache_request_headers()['Authorization'] ?? '') : '');
    if (preg_match('/Bearer\s+(.+)$/i', $auth, $m)) {
        return trim($m[1]);
    }
    return null;
}

function authenticate_user(PDO $pdo): array
{
    $token = get_auth_token();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['error' => 'Missing authentication token']);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT u.id, u.username, u.role_id, u.department_id,
               r.name AS role_name, d.name AS dept_name,
               t.device_fingerprint, t.ip_address
          FROM user_tokens t
          JOIN users u ON t.user_id = u.id
          LEFT JOIN roles r ON u.role_id = r.id
          LEFT JOIN departments d ON u.department_id = d.id
         WHERE t.token = ?
           AND t.expires_at > NOW()
           AND u.is_active = TRUE
    ");
    $stmt->execute([$token]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid or expired session. Please login again.']);
        exit;
    }

    // ── Device consistency check ──────────────────────────────
    $clientFp = get_device_fingerprint();
    if ($clientFp && $user['device_fingerprint'] && $clientFp !== $user['device_fingerprint']) {
        // Token used from a different device fingerprint — reject
        http_response_code(401);
        echo json_encode(['error' => 'Session device mismatch. Please login again.']);
        exit;
    }

    // Refresh last_seen
    $pdo->prepare("UPDATE user_tokens SET last_seen = NOW() WHERE token = ?")
        ->execute([$token]);

    return $user;
}

/**
 * Create / replace session token.
 * UNIQUE(user_id) means INSERT … ON CONFLICT replaces old session →
 * logging in from a new device automatically kills the previous session.
 */
function create_session(PDO $pdo, int $userId, string $deviceFp, string $ip): string
{
    $token = bin2hex(random_bytes(32)); // 64-char hex token
    $expiresAt = date('Y-m-d H:i:s', strtotime('+12 hours'));
    $ua = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

    // Upsert: if user already has a token, replace it (kicks other device)
    $pdo->prepare("
        INSERT INTO user_tokens (token, user_id, device_fingerprint, ip_address, user_agent, expires_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (user_id) DO UPDATE
           SET token              = EXCLUDED.token,
               device_fingerprint = EXCLUDED.device_fingerprint,
               ip_address         = EXCLUDED.ip_address,
               user_agent         = EXCLUDED.user_agent,
               created_at         = NOW(),
               last_seen          = NOW(),
               expires_at         = EXCLUDED.expires_at
    ")->execute([$token, $userId, $deviceFp, $ip, $ua, $expiresAt]);

    return $token;
}

/**
 * Write a rich audit entry.
 */
function audit(
    PDO $pdo,
    ?int $userId,
    string $username,
    string $action,
    string $entity = '',
    ?int $entityId = null,
    string $oldValue = '',
    string $newValue = ''
): void {
    $ip = get_client_ip();
    $fp = get_device_fingerprint();
    $pdo->prepare("
        INSERT INTO audit_logs
            (user_id, username, action, entity, entity_id, old_value, new_value, ip_address, device_fingerprint)
        VALUES (?,?,?,?,?,?,?,?,?)
    ")->execute([$userId, $username, $action, $entity, $entityId, $oldValue, $newValue, $ip, $fp]);
}

// Max failed login attempts before lockout
const MAX_FAILED = 5;
const LOCKOUT_MINUTES = 5;

function verify_admin_password(PDO $pdo, array $user, string $password): bool
{
    if ($user['role_name'] !== 'Admin') {
        http_response_code(403);
        echo json_encode(['error' => 'Permission denied. Admins only.']);
        exit;
    }
    if (!$password) {
        http_response_code(400);
        echo json_encode(['error' => 'Admin password required.']);
        exit;
    }
    $stmt = $pdo->prepare("SELECT password_hash, failed_attempts, locked_until FROM users WHERE id = ?");
    $stmt->execute([$user['id']]);
    $u = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($u && $u['locked_until'] && strtotime($u['locked_until']) > time()) {
        $remainingSecs = max(1, strtotime($u['locked_until']) - time());
        $mins = max(1, (int) ceil($remainingSecs / 60));
        http_response_code(429);
        echo json_encode([
            'error' => "Account locked due to 5 failed attempts.",
            'locked' => true,
            'remaining_seconds' => $remainingSecs,
            'remaining_minutes' => $mins
        ]);
        exit;
    }

    if ($u && password_verify($password, $u['password_hash'])) {
        $pdo->prepare("UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=?")
            ->execute([$user['id']]);
        return true;
    } else {
        $fails = (int) ($u['failed_attempts'] ?? 0) + 1;
        if ($fails >= MAX_FAILED) {
            $lock = date('Y-m-d H:i:s', strtotime('+' . LOCKOUT_MINUTES . ' minutes'));
            $pdo->prepare("UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?")
                ->execute([$fails, $lock, $user['id']]);
            http_response_code(429);
            echo json_encode([
                'error' => "5 failed attempts reached. Account is locked.",
                'locked' => true,
                'remaining_seconds' => LOCKOUT_MINUTES * 60,
                'remaining_minutes' => LOCKOUT_MINUTES
            ]);
            exit;
        } else {
            $pdo->prepare("UPDATE users SET failed_attempts=?, locked_until=NULL WHERE id=?")
                ->execute([$fails, $user['id']]);
            http_response_code(403);
            echo json_encode([
                'error' => 'Invalid admin password.',
                'locked' => false
            ]);
            exit;
        }
    }
}

/**
 * Calculate the currently active holders (assignees) and their outstanding issued quantities
 * for a specific product based on all past issue & return transactions.
 */
function get_product_active_holders(PDO $pdo, int $productId, ?array $product = null): array
{
    if (!$product) {
        $stmt = $pdo->prepare("SELECT id, name, current_stock, auth_qty, issued_to FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
    }
    if (!$product) return [];

    $stmt = $pdo->prepare("
        SELECT type, quantity, notes
          FROM transactions
         WHERE product_id = ?
           AND type IN ('issue', 'return')
         ORDER BY id ASC
    ");
    $stmt->execute([$productId]);
    $txs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $balances = [];
    foreach ($txs as $t) {
        $type = $t['type'];
        $qty = (int) $t['quantity'];
        $notes = $t['notes'] ?? '';
        $person = '';

        if ($type === 'issue') {
            if (preg_match('/Issued To:\s*([^|]+)/i', $notes, $m)) {
                $person = trim($m[1]);
            }
        } elseif ($type === 'return') {
            if (preg_match('/Returned By:\s*([^|]+)/i', $notes, $m)) {
                $person = trim($m[1]);
            }
        }

        if (!$person) {
            $person = 'Staff';
        }

        $key = mb_strtolower($person);
        if (!isset($balances[$key])) {
            $balances[$key] = ['person' => $person, 'qty_held' => 0];
        }
        if ($type === 'issue') {
            $balances[$key]['qty_held'] += $qty;
        } elseif ($type === 'return') {
            $balances[$key]['qty_held'] -= $qty;
        }
    }

    $active = [];
    foreach ($balances as $b) {
        if ($b['qty_held'] > 0) {
            $active[] = $b;
        }
    }

    // Fallback if no transactions recorded yet but product has legacy/initial issued_to
    if (empty($active) && !empty($product['issued_to']) && strcasecmp(trim($product['issued_to']), 'Unassigned') !== 0) {
        $rawIssued = trim($product['issued_to']);
        $issuedNames = array_filter(array_map('trim', explode(',', $rawIssued)));
        foreach ($issuedNames as $rawName) {
            if (preg_match('/^(.+?)\s*\((\d+)\s*units?\)$/i', $rawName, $m)) {
                $active[] = ['person' => trim($m[1]), 'qty_held' => (int) $m[2]];
            } else {
                $held = max(1, ((int)($product['auth_qty'] ?? 0) - (int)($product['current_stock'] ?? 0)));
                $active[] = ['person' => $rawName, 'qty_held' => $held];
            }
        }
    }

    return $active;
}

// ── Router ────────────────────────────────────────────────────
switch ($action) {

    // ── Login ─────────────────────────────────────────
    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST')
            break;

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $username = trim($body['username'] ?? '');
        $password = trim($body['password'] ?? '');
        $deviceFp = get_device_fingerprint() ?: bin2hex(random_bytes(16));
        $ip = get_client_ip();

        if (!$username || !$password) {
            http_response_code(400);
            echo json_encode(['error' => 'Username and password are required']);
            break;
        }

        $stmt = $pdo->prepare("
            SELECT u.*, r.name AS role_name, d.name AS dept_name
              FROM users u
              LEFT JOIN roles r ON u.role_id = r.id
              LEFT JOIN departments d ON u.department_id = d.id
             WHERE u.username = ?
        ");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        // Account lockout check
        if ($user && $user['locked_until'] && strtotime($user['locked_until']) > time()) {
            $remainingSecs = max(1, strtotime($user['locked_until']) - time());
            $remaining = ceil($remainingSecs / 60);
            http_response_code(429);
            echo json_encode([
                'error' => "Account locked due to 5 failed attempts.",
                'locked' => true,
                'remaining_seconds' => $remainingSecs,
                'remaining_minutes' => $remaining
            ]);
            audit($pdo, $user['id'], $username, 'Login blocked — account locked', 'session', null, '', $ip);
            break;
        }

        // Verify: standard bcrypt check
        if ($user && $user['is_active'] && password_verify($password, $user['password_hash'])) {
            // Reset failed attempts
            $pdo->prepare("UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=?")
                ->execute([$user['id']]);

            $token = create_session($pdo, $user['id'], $deviceFp, $ip);

            $publicUser = [
                'id' => $user['id'],
                'username' => $user['username'],
                'role_id' => $user['role_id'],
                'role_name' => $user['role_name'],
                'department_id' => $user['department_id'],
                'dept_name' => $user['dept_name'],
            ];

            audit($pdo, $user['id'], $username, 'Login successful', 'Session', null, '', '');
            echo json_encode(['success' => true, 'user' => $publicUser, 'token' => $token]);
        } else {
            // Wrong credentials
            if ($user) {
                $fails = $user['failed_attempts'] + 1;
                $lock = $fails >= MAX_FAILED
                    ? date('Y-m-d H:i:s', strtotime('+' . LOCKOUT_MINUTES . ' minutes'))
                    : null;
                $pdo->prepare("UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?")
                    ->execute([$fails, $lock, $user['id']]);
                audit($pdo, $user['id'], $username, 'Login failed', 'Session', null, '', "Attempt $fails");

                if ($fails >= MAX_FAILED) {
                    http_response_code(429);
                    echo json_encode([
                        'error' => "5 failed attempts reached. Account is locked.",
                        'locked' => true,
                        'remaining_seconds' => LOCKOUT_MINUTES * 60,
                        'remaining_minutes' => LOCKOUT_MINUTES
                    ]);
                    break;
                }
            } else {
                audit($pdo, null, $username, 'Login failed — unknown user', 'Session', null, '', '');
            }
            http_response_code(401);
            echo json_encode(['error' => 'Invalid username or password']);
        }
        break;



    // ── Forgot Password ──────────────────────────────────────────
    case 'forgot_password_step1':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') break;
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $username = trim($body['username'] ?? '');
        if (!$username) {
            http_response_code(400);
            echo json_encode(['error' => 'Username required']);
            break;
        }

        $stmt = $pdo->prepare("SELECT sec_q1, sec_q2 FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && $user['sec_q1'] && $user['sec_q2']) {
            echo json_encode([
                'success' => true,
                'q1' => $user['sec_q1'],
                'q2' => $user['sec_q2']
            ]);
        } else {
            // Delay to prevent user enumeration
            usleep(rand(100000, 300000));
            http_response_code(404);
            echo json_encode(['error' => 'Security questions not set or user not found.']);
        }
        break;

    case 'forgot_password_step2':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') break;
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $username = trim($body['username'] ?? '');
        $ans1 = trim($body['ans1'] ?? '');
        $ans2 = trim($body['ans2'] ?? '');

        if (!$username || !$ans1 || !$ans2) {
            http_response_code(400);
            echo json_encode(['error' => 'All fields required']);
            break;
        }

        $stmt = $pdo->prepare("SELECT id, failed_attempts, locked_until, sec_a1_hash, sec_a2_hash, encrypted_pwd FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            usleep(rand(100000, 300000));
            http_response_code(400);
            echo json_encode(['error' => 'Invalid answers']);
            break;
        }

        // Lockout check
        if ($user['locked_until'] && strtotime($user['locked_until']) > time()) {
            http_response_code(429);
            echo json_encode(['error' => "Account locked. Try again later."]);
            break;
        }

        if (
            password_verify(strtolower($ans1), $user['sec_a1_hash']) &&
            password_verify(strtolower($ans2), $user['sec_a2_hash'])
        ) {
            // Reset fails
            $pdo->prepare("UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=?")
                ->execute([$user['id']]);

            // Decrypt password
            $decrypted = null;
            if ($user['encrypted_pwd']) {
                $decoded = base64_decode($user['encrypted_pwd']);
                if (strpos($decoded, '::') !== false) {
                    list($encrypted_data, $iv) = explode('::', $decoded, 2);
                    $decrypted = openssl_decrypt($encrypted_data, 'aes-256-cbc', ENCRYPTION_KEY, 0, $iv);
                }
            }

            if ($decrypted) {
                audit($pdo, $user['id'], $username, 'Recovered Password via Security Questions', 'User');
                echo json_encode(['success' => true, 'password' => $decrypted]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to decrypt password']);
            }
        } else {
            // Increment fails
            $fails = $user['failed_attempts'] + 1;
            $lock = $fails >= MAX_FAILED
                ? date('Y-m-d H:i:s', strtotime('+' . LOCKOUT_MINUTES . ' minutes'))
                : null;
            $pdo->prepare("UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?")
                ->execute([$fails, $lock, $user['id']]);
            
            audit($pdo, $user['id'], $username, 'Failed Password Recovery', 'User', null, '', "Attempt $fails");
            
            if ($fails >= MAX_FAILED) {
                http_response_code(429);
                echo json_encode(['error' => "Access blocked after 5 failed attempts."]);
            } else {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid answers']);
            }
        }
        break;

    // ── Logout ────────────────────────────────────────────────
    case 'logout':
        $user = authenticate_user($pdo);
        $token = get_auth_token();
        $pdo->prepare("DELETE FROM user_tokens WHERE token = ?")->execute([$token]);
        audit($pdo, $user['id'], $user['username'], 'Logout', 'session');
        echo json_encode(['success' => true]);
        break;

    // ── Check session status (used on app load) ───────────────
    case 'session_check':
        $user = authenticate_user($pdo);
        echo json_encode([
            'valid' => true,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'role_name' => $user['role_name'],
                'dept_name' => $user['dept_name'],
            ]
        ]);
        break;

    // ── Dashboard ─────────────────────────────────────────────
    case 'dashboard':
        $user = authenticate_user($pdo);
        $total = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
        $lowCount = $pdo->query("SELECT COUNT(*) FROM products WHERE current_stock <= min_stock_level")->fetchColumn();
        $recent = $pdo->query("
            SELECT t.id, t.type, t.quantity, t.transaction_date, t.notes,
                   p.name AS product_name, u.username, d.name AS dept_name
              FROM transactions t
              LEFT JOIN products p ON t.product_id = p.id
              LEFT JOIN users u ON t.user_id = u.id
              LEFT JOIN departments d ON t.department_id = d.id
             ORDER BY t.transaction_date DESC LIMIT 8
        ")->fetchAll(PDO::FETCH_ASSOC);
        $lowItems = $pdo->query("
            SELECT * FROM products WHERE current_stock <= min_stock_level ORDER BY current_stock ASC LIMIT 5
        ")->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode([
            'totalProducts' => $total,
            'lowStockCount' => $lowCount,
            'recentTransactions' => $recent,
            'lowStockItems' => $lowItems,
        ]);
        break;

    // ── Categories ────────────────────────────────────────────
    case 'categories':
        $user = authenticate_user($pdo);
        $method = $_SERVER['REQUEST_METHOD'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if ($method === 'GET') {
            $stmt = $pdo->query("
                SELECT 
                    c.id, 
                    c.name,
                    COUNT(DISTINCT s.id)::int AS subcategories_count,
                    COUNT(DISTINCT p.id)::int AS products_count,
                    COALESCE(SUM(p.current_stock), 0)::int AS total_stock
                FROM categories c
                LEFT JOIN subcategories s ON s.category_id = c.id
                LEFT JOIN products p ON p.subcategory_id = s.id
                GROUP BY c.id, c.name
                ORDER BY c.name ASC
            ");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } elseif (($method === 'POST' && ($body['action'] ?? '') === 'delete') || $method === 'DELETE') {
            $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'Category ID required']);
                break;
            }
            $stmt = $pdo->prepare("SELECT name FROM categories WHERE id = ?");
            $stmt->execute([$id]);
            $cat = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$cat) {
                http_response_code(404);
                echo json_encode(['error' => 'Category not found']);
                break;
            }
            $pdo->prepare("DELETE FROM categories WHERE id = ?")->execute([$id]);
            audit($pdo, $user['id'], $user['username'], 'Deleted category', 'category', $id, $cat['name'], '');
            echo json_encode(['success' => true]);
        } elseif ($method === 'PUT' || ($method === 'POST' && (($body['action'] ?? '') === 'update' || !empty($body['id'])))) {
            $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
            $name = trim($body['name'] ?? '');
            if (!$id || !$name) {
                http_response_code(400);
                echo json_encode(['error' => 'Category ID and Name are required']);
                break;
            }
            $stmt = $pdo->prepare("SELECT name FROM categories WHERE id = ?");
            $stmt->execute([$id]);
            $cat = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$cat) {
                http_response_code(404);
                echo json_encode(['error' => 'Category not found']);
                break;
            }
            $pdo->prepare("UPDATE categories SET name = ? WHERE id = ?")->execute([$name, $id]);
            audit($pdo, $user['id'], $user['username'], 'Updated category', 'category', $id, $cat['name'], $name);
            echo json_encode(['success' => true]);
        } elseif ($method === 'POST') {
            $name = trim($body['name'] ?? '');
            if (!$name) {
                http_response_code(400);
                echo json_encode(['error' => 'Name required']);
                break;
            }
            $stmt = $pdo->prepare("SELECT id FROM categories WHERE LOWER(name) = LOWER(?)");
            $stmt->execute([$name]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'Category already exists']);
                break;
            }
            $pdo->prepare("INSERT INTO categories (name) VALUES (?)")->execute([$name]);
            $id = (int) $pdo->lastInsertId();
            audit($pdo, $user['id'], $user['username'], 'Added category', 'category', $id, '', $name);
            echo json_encode(['success' => true, 'id' => $id]);
        }
        break;

    // ── Subcategories ─────────────────────────────────────────
    case 'subcategories':
        $user = authenticate_user($pdo);
        $method = $_SERVER['REQUEST_METHOD'];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];

        if ($method === 'GET') {
            $catId = isset($_GET['category_id']) && $_GET['category_id'] !== '' ? (int) $_GET['category_id'] : null;
            $sql = "
                SELECT 
                    s.id, 
                    s.name, 
                    s.category_id, 
                    c.name AS category_name,
                    COUNT(DISTINCT p.id)::int AS products_count,
                    COALESCE(SUM(p.current_stock), 0)::int AS total_stock
                FROM subcategories s
                JOIN categories c ON s.category_id = c.id
                LEFT JOIN products p ON p.subcategory_id = s.id
            ";
            if ($catId) {
                $sql .= " WHERE s.category_id = ? ";
            }
            $sql .= " GROUP BY s.id, s.name, s.category_id, c.name ORDER BY c.name ASC, s.name ASC ";

            $stmt = $pdo->prepare($sql);
            if ($catId) {
                $stmt->execute([$catId]);
            } else {
                $stmt->execute();
            }
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } elseif (($method === 'POST' && ($body['action'] ?? '') === 'delete') || $method === 'DELETE') {
            $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'Subcategory ID required']);
                break;
            }
            $stmt = $pdo->prepare("SELECT name FROM subcategories WHERE id = ?");
            $stmt->execute([$id]);
            $sub = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$sub) {
                http_response_code(404);
                echo json_encode(['error' => 'Subcategory not found']);
                break;
            }
            $pdo->prepare("DELETE FROM subcategories WHERE id = ?")->execute([$id]);
            audit($pdo, $user['id'], $user['username'], 'Deleted subcategory', 'subcategory', $id, $sub['name'], '');
            echo json_encode(['success' => true]);
        } elseif ($method === 'PUT' || ($method === 'POST' && (($body['action'] ?? '') === 'update' || !empty($body['id'])))) {
            $id = (int) ($body['id'] ?? $_GET['id'] ?? 0);
            $name = trim($body['name'] ?? '');
            $catId = (int) ($body['category_id'] ?? 0);
            if (!$id || !$name || !$catId) {
                http_response_code(400);
                echo json_encode(['error' => 'Subcategory ID, Name, and Parent Category are required']);
                break;
            }
            $stmt = $pdo->prepare("SELECT name, category_id FROM subcategories WHERE id = ?");
            $stmt->execute([$id]);
            $sub = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$sub) {
                http_response_code(404);
                echo json_encode(['error' => 'Subcategory not found']);
                break;
            }
            $pdo->prepare("UPDATE subcategories SET name = ?, category_id = ? WHERE id = ?")->execute([$name, $catId, $id]);
            audit($pdo, $user['id'], $user['username'], 'Updated subcategory', 'subcategory', $id, $sub['name'], "{$name} (Cat ID: {$catId})");
            echo json_encode(['success' => true]);
        } elseif ($method === 'POST') {
            $name = trim($body['name'] ?? '');
            $catId = (int) ($body['category_id'] ?? 0);
            if (!$name || !$catId) {
                http_response_code(400);
                echo json_encode(['error' => 'Name and Parent Category required']);
                break;
            }
            $stmt = $pdo->prepare("SELECT id FROM subcategories WHERE category_id = ? AND LOWER(name) = LOWER(?)");
            $stmt->execute([$catId, $name]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'Subcategory already exists under this Category']);
                break;
            }
            $pdo->prepare("INSERT INTO subcategories (category_id, name) VALUES (?,?)")->execute([$catId, $name]);
            $id = (int) $pdo->lastInsertId();
            audit($pdo, $user['id'], $user['username'], 'Added subcategory', 'subcategory', $id, '', $name);
            echo json_encode(['success' => true, 'id' => $id]);
        }
        break;

    // ── Products ──────────────────────────────────────────────
    case 'products':
        $user = authenticate_user($pdo);
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            echo json_encode($pdo->query("
                SELECT p.*, s.name AS subcategory_name, c.name AS category_name
                  FROM products p
                  LEFT JOIN subcategories s ON p.subcategory_id = s.id
                  LEFT JOIN categories c ON s.category_id = c.id
                 ORDER BY p.id DESC
            ")->fetchAll(PDO::FETCH_ASSOC));
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
            $subId = !empty($body['subcategory_id']) ? (int) $body['subcategory_id'] : null;
            $barcode = !empty($body['barcode']) ? $body['barcode'] : 'BC-' . strtoupper(substr(uniqid(), -6));
            $stock = (int) ($body['current_stock'] ?? 0);
            $min = (int) ($body['min_stock_level'] ?? 5);
            $location = !empty($body['location']) ? trim($body['location']) : 'Warehouse Main';
            $uom = !empty($body['uom']) ? trim($body['uom']) : 'Unit';
            $cond = !empty($body['condition']) ? trim($body['condition']) : 'Good condition';

            $pdo->prepare("
                INSERT INTO products (subcategory_id, name, sku, barcode, min_stock_level, current_stock, location, uom, condition, auth_qty, system_qty, serviceable_qty)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
            ")->execute([$subId, $body['name'], $body['sku'], $barcode, $min, $stock, $location, $uom, $cond, $stock, $stock, $stock]);
            $id = (int) $pdo->lastInsertId();

            audit(
                $pdo,
                $user['id'],
                $user['username'],
                'Added Product',
                "{$body['name']} ({$body['sku']})",
                $id,
                'Stock: 0',
                "Stock: {$stock} | Loc: {$location}"
            );
            echo json_encode(['success' => true]);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'PUT') {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
            verify_admin_password($pdo, $user, trim($body['admin_password'] ?? ''));

            $productId = (int) ($body['id'] ?? 0);
            $subId = !empty($body['subcategory_id']) ? (int) $body['subcategory_id'] : null;
            $name = $body['name'] ?? '';
            $sku = $body['sku'] ?? '';
            $barcode = $body['barcode'] ?? '';
            $min = (int) ($body['min_stock_level'] ?? 5);
            $location = !empty($body['location']) ? trim($body['location']) : 'Warehouse Main';
            $uom = !empty($body['uom']) ? trim($body['uom']) : 'Unit';
            $cond = !empty($body['condition']) ? trim($body['condition']) : 'Good condition';

            if (!$productId || !$name || !$sku) {
                http_response_code(400);
                echo json_encode(['error' => 'Product ID, Name, and SKU are required.']);
                break;
            }

            $stmt = $pdo->prepare("SELECT * FROM products WHERE id = ?");
            $stmt->execute([$productId]);
            $existing = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['error' => 'Product not found']);
                break;
            }

            $oldStock = (int) $existing['current_stock'];
            $newStock = isset($body['current_stock']) ? max(0, (int) $body['current_stock']) : $oldStock;

            $pdo->prepare("
                UPDATE products 
                   SET subcategory_id=?, name=?, sku=?, barcode=?, current_stock=?, min_stock_level=?, location=?, uom=?, condition=?, auth_qty=?, system_qty=?, serviceable_qty=?, updated_at=NOW()
                 WHERE id=?
            ")->execute([$subId, $name, $sku, $barcode, $newStock, $min, $location, $uom, $cond, $newStock, $newStock, $newStock, $productId]);

            if ($newStock !== $oldStock) {
                $diff = $newStock - $oldStock;
                $txType = $diff > 0 ? 'add' : 'remove';
                $pdo->prepare("
                    INSERT INTO transactions (product_id, user_id, department_id, type, quantity, old_stock, new_stock, notes)
                    VALUES (?,?,?,?,?,?,?,?)
                ")->execute([$productId, $user['id'], $user['department_id'] ?? null, $txType, abs($diff), $oldStock, $newStock, "Admin stock correction via Edit Product"]);
            }

            audit(
                $pdo,
                $user['id'],
                $user['username'],
                'Edited Product & Stock',
                "{$name} ({$sku})",
                $productId,
                "Stock: {$oldStock}",
                "Stock: {$newStock} | Loc: {$location} | Min: {$min}"
            );
            echo json_encode(['success' => true]);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
            verify_admin_password($pdo, $user, trim($body['admin_password'] ?? ''));

            $productId = (int) ($_GET['id'] ?? $body['id'] ?? 0);
            if (!$productId) {
                http_response_code(400);
                echo json_encode(['error' => 'Product ID required']);
                break;
            }
            $stmt = $pdo->prepare("SELECT name, sku, current_stock FROM products WHERE id = ?");
            $stmt->execute([$productId]);
            $prod = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$prod) {
                http_response_code(404);
                echo json_encode(['error' => 'Product not found']);
                break;
            }
            $pdo->prepare("DELETE FROM products WHERE id = ?")->execute([$productId]);
            audit(
                $pdo,
                $user['id'],
                $user['username'],
                'Deleted Product',
                "{$prod['name']} ({$prod['sku']})",
                $productId,
                "Stock: {$prod['current_stock']}",
                'Product deleted from inventory'
            );
            echo json_encode(['success' => true]);
        }
        break;

    // ── Product lookup by Barcode / SKU ────────────────────────────
    case 'scan':
    case 'product_by_barcode':
        $user = authenticate_user($pdo);
        $barcode = trim($_GET['barcode'] ?? '');
        $stmt = $pdo->prepare("
            SELECT p.*, s.name AS subcategory_name
              FROM products p
              LEFT JOIN subcategories s ON p.subcategory_id = s.id
             WHERE p.barcode = ? OR p.sku = ?
        ");
        $stmt->execute([$barcode, $barcode]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($product) {
            $holders = get_product_active_holders($pdo, (int)$product['id'], $product);
            $product['active_holders'] = $holders;
            if (!empty($holders)) {
                $product['issued_to'] = implode(', ', array_map(fn($h) => "{$h['person']} ({$h['qty_held']} units)", $holders));
            } else {
                $product['issued_to'] = 'Unassigned';
            }
            echo json_encode($product);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Product not found']);
        }
        break;

    // ── Transaction (issue / return / add) ───────────────────
    case 'transaction':
        $user = authenticate_user($pdo);
        if ($_SERVER['REQUEST_METHOD'] !== 'POST')
            break;

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $productId = (int) ($body['product_id'] ?? 0);
        $type = $body['type'] ?? '';
        $qty = (int) ($body['quantity'] ?? 0);
        $deptId = !empty($body['department_id']) ? (int) $body['department_id'] : ($user['department_id'] ?? null);
        $notes = substr(trim($body['notes'] ?? ''), 0, 500);
        $issuedTo = trim($body['issued_to'] ?? $body['assignee'] ?? $body['returned_by'] ?? '');

        if (!in_array($type, ['issue', 'return', 'add', 'remove'], true) || $qty < 1 || !$productId) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid transaction parameters']);
            break;
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT id, name, sku, current_stock, min_stock_level, auth_qty, issued_to FROM products WHERE id = ? FOR UPDATE");
            $stmt->execute([$productId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$product)
                throw new Exception('Product not found');

            $oldStock = (int) $product['current_stock'];
            $newStock = $oldStock;

            if ($type === 'issue' || $type === 'remove')
                $newStock -= $qty;
            else
                $newStock += $qty;

            if ($newStock < 0)
                throw new Exception('Insufficient stock. Available: ' . $oldStock);

            if ($type === 'issue') {
                if (!$issuedTo && preg_match('/Issued To:\s*([^|]+)/i', $notes, $m)) {
                    $issuedTo = trim($m[1]);
                }
                $finalIssuedTo = $issuedTo ?: 'Assigned';
                if (!str_contains($notes, 'Issued To:')) {
                    $notes = "Issued To: {$finalIssuedTo}" . ($notes ? " | {$notes}" : "");
                }

                $pdo->prepare("
                    INSERT INTO transactions (product_id, user_id, department_id, type, quantity, old_stock, new_stock, notes)
                    VALUES (?,?,?,?,?,?,?,?)
                ")->execute([$productId, $user['id'], $deptId, $type, $qty, $oldStock, $newStock, $notes]);

                $holders = get_product_active_holders($pdo, $productId, $product);
                $newIssuedToStr = !empty($holders)
                    ? implode(', ', array_map(fn($h) => "{$h['person']} ({$h['qty_held']} units)", $holders))
                    : 'Unassigned';

                $pdo->prepare("UPDATE products SET current_stock = ?, issued_to = ?, updated_at = NOW() WHERE id = ?")
                    ->execute([$newStock, $newIssuedToStr, $productId]);
            } elseif ($type === 'return') {
                $activeHolders = get_product_active_holders($pdo, $productId, $product);
                if (empty($activeHolders)) {
                    throw new Exception("Cannot return '{$product['name']}': this product is currently Unassigned (not issued to anyone).");
                }

                if (!$issuedTo && preg_match('/Returned By:\s*([^|]+)/i', $notes, $m)) {
                    $issuedTo = trim($m[1]);
                }

                if (!$issuedTo) {
                    throw new Exception("Returned By is a compulsory field. Please select who is returning the item.");
                }

                // Match holder (case-insensitive)
                $matchedHolder = null;
                foreach ($activeHolders as $h) {
                    if (strcasecmp(trim($h['person']), $issuedTo) === 0) {
                        $matchedHolder = $h;
                        break;
                    }
                }

                if (!$matchedHolder) {
                    $holderNames = implode(', ', array_column($activeHolders, 'person'));
                    throw new Exception("Cannot return item from '{$issuedTo}'. This stock is currently issued to: {$holderNames}.");
                }

                // Rule: Cannot return more than what this specific person was issued
                if ($qty > $matchedHolder['qty_held']) {
                    throw new Exception("Cannot return {$qty} unit(s) from '{$matchedHolder['person']}'. They currently only hold {$matchedHolder['qty_held']} issued unit(s).");
                }

                // Rule: Cannot exceed Authorized Qty
                $authQty = (int) ($product['auth_qty'] ?? 0);
                if ($authQty > 0 && $newStock > $authQty) {
                    $maxReturnable = max(0, $authQty - $oldStock);
                    throw new Exception("Cannot return {$qty} unit(s). Stock after return ({$newStock}) would exceed Authorized Qty ({$authQty}). Maximum returnable: {$maxReturnable}.");
                }

                $returnPerson = $matchedHolder['person'];
                if (!str_contains($notes, 'Returned By:')) {
                    $notes = "Returned By: {$returnPerson}" . ($notes ? " | {$notes}" : "");
                }

                $pdo->prepare("
                    INSERT INTO transactions (product_id, user_id, department_id, type, quantity, old_stock, new_stock, notes)
                    VALUES (?,?,?,?,?,?,?,?)
                ")->execute([$productId, $user['id'], $deptId, $type, $qty, $oldStock, $newStock, $notes]);

                $holders = get_product_active_holders($pdo, $productId, $product);
                $newIssuedToStr = !empty($holders)
                    ? implode(', ', array_map(fn($h) => "{$h['person']} ({$h['qty_held']} units)", $holders))
                    : 'Unassigned';

                $pdo->prepare("UPDATE products SET current_stock = ?, issued_to = ?, updated_at = NOW() WHERE id = ?")
                    ->execute([$newStock, $newIssuedToStr, $productId]);
            } elseif ($type === 'add') {
                $pdo->prepare("UPDATE products SET current_stock = ?, auth_qty = GREATEST(auth_qty, ?), system_qty = ?, serviceable_qty = ?, updated_at = NOW() WHERE id = ?")
                    ->execute([$newStock, $newStock, $newStock, $newStock, $productId]);

                $pdo->prepare("
                    INSERT INTO transactions (product_id, user_id, department_id, type, quantity, old_stock, new_stock, notes)
                    VALUES (?,?,?,?,?,?,?,?)
                ")->execute([$productId, $user['id'], $deptId, $type, $qty, $oldStock, $newStock, $notes]);
            } else {
                $pdo->prepare("UPDATE products SET current_stock = ?, updated_at = NOW() WHERE id = ?")
                    ->execute([$newStock, $productId]);

                $pdo->prepare("
                    INSERT INTO transactions (product_id, user_id, department_id, type, quantity, old_stock, new_stock, notes)
                    VALUES (?,?,?,?,?,?,?,?)
                ")->execute([$productId, $user['id'], $deptId, $type, $qty, $oldStock, $newStock, $notes]);
            }

            audit(
                $pdo,
                $user['id'],
                $user['username'],
                ucfirst($type) . ' Transaction',
                "{$product['name']} ({$product['sku']})",
                $productId,
                "Stock: {$oldStock}",
                "Stock: {$newStock} (" . ($type === 'issue' || $type === 'remove' ? "-{$qty}" : "+{$qty}") . ")" . ($notes ? " | {$notes}" : "")
            );

            $pdo->commit();
            if (ob_get_length())
                ob_clean();
            echo json_encode(['success' => true, 'new_stock' => $newStock, 'issued_to' => ($newIssuedToStr ?? 'Unassigned')]);
        } catch (Exception $e) {
            $pdo->rollBack();
            if (ob_get_length())
                ob_clean();
            http_response_code(400);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    // ── Reports: transactions ─────────────────────────────────
    case 'reports':
        $user = authenticate_user($pdo);
        $stmt = $pdo->query("
            SELECT t.id, t.type, t.quantity, t.old_stock, t.new_stock,
                   t.transaction_date, t.notes,
                   p.name AS product_name, p.sku,
                   u.username,
                   d.name AS department_name
              FROM transactions t
              LEFT JOIN products p ON t.product_id = p.id
              LEFT JOIN users u ON t.user_id = u.id
              LEFT JOIN departments d ON t.department_id = d.id
             ORDER BY t.transaction_date DESC
        ");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    // ── Audit log (full security trail with pagination support) ──
    case 'audit_logs':
        $user = authenticate_user($pdo);
        if (isset($_GET['page'])) {
            $page = max(1, intval($_GET['page']));
            $limit = max(1, min(100, intval($_GET['limit'] ?? 20)));
            $offset = ($page - 1) * $limit;

            $total = (int) $pdo->query("SELECT COUNT(*) FROM audit_logs")->fetchColumn();
            $totalPages = max(1, (int) ceil($total / $limit));

            $stmt = $pdo->prepare("
                SELECT a.id, a.username, a.action, a.entity, a.entity_id,
                       a.old_value, a.new_value, a.ip_address,
                       a.device_fingerprint, a.timestamp
                  FROM audit_logs a
                 ORDER BY a.timestamp DESC
                 LIMIT :limit OFFSET :offset
            ");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
            $stmt->execute();
            $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

            echo json_encode([
                'data' => $logs,
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'total_pages' => $totalPages
            ]);
        } else {
            $limit = max(1, min(500, intval($_GET['limit'] ?? 500)));
            $stmt = $pdo->prepare("
                SELECT a.id, a.username, a.action, a.entity, a.entity_id,
                       a.old_value, a.new_value, a.ip_address,
                       a.device_fingerprint, a.timestamp
                  FROM audit_logs a
                 ORDER BY a.timestamp DESC
                 LIMIT :limit
            ");
            $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
            $stmt->execute();
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        break;

    // ── Departments ───────────────────────────────────────────
    case 'departments':
        authenticate_user($pdo);
        echo json_encode($pdo->query("SELECT * FROM departments ORDER BY name")->fetchAll(PDO::FETCH_ASSOC));
        break;

    // ── Users list for assignees / return dropdown ────────────
    case 'users':
        $user = authenticate_user($pdo);
        $stmt = $pdo->query("
            SELECT u.id, u.username, u.barcode, r.name AS role_name, d.name AS dept_name
              FROM users u
              LEFT JOIN roles r ON u.role_id = r.id
              LEFT JOIN departments d ON u.department_id = d.id
             WHERE u.is_active = TRUE
             ORDER BY u.username
        ");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    // ── Roles with user counts ────────────────────────────────
    case 'roles':
        $user = authenticate_user($pdo);
        $stmt = $pdo->query("
            SELECT r.id, r.name, COUNT(u.id) AS user_count
              FROM roles r
              LEFT JOIN users u ON u.role_id = r.id AND u.is_active = TRUE
             GROUP BY r.id, r.name
             ORDER BY r.name
        ");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    // ── Stock summary: monthly KPIs + threshold table ─────────
    case 'stock_summary':
        $user = authenticate_user($pdo);
        $stockIn = $pdo->query("
            SELECT COUNT(*) FROM transactions
             WHERE type IN ('add','return')
               AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', NOW())
        ")->fetchColumn();
        $stockOut = $pdo->query("
            SELECT COUNT(*) FROM transactions
             WHERE type IN ('issue','remove')
               AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', NOW())
        ")->fetchColumn();
        $auditCorrections = $pdo->query("
            SELECT COUNT(*) FROM audit_logs
             WHERE action ILIKE '%adjust%'
               AND timestamp >= NOW() - INTERVAL '30 days'
        ")->fetchColumn();
        $products = $pdo->query("
            SELECT p.id, p.name, p.sku, p.current_stock, p.min_stock_level,
                   s.name AS subcategory_name
              FROM products p
              LEFT JOIN subcategories s ON p.subcategory_id = s.id
             ORDER BY p.current_stock ASC
        ")->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode([
            'stockIn' => (int) $stockIn,
            'stockOut' => (int) $stockOut,
            'auditCorrections' => (int) $auditCorrections,
            'products' => $products,
        ]);
        break;

    // ── Allocations: issue/return history with user + dept ────
    case 'allocations':
        $user = authenticate_user($pdo);
        $stmt = $pdo->query("
            SELECT t.id, t.type, t.quantity, t.transaction_date, t.notes,
                   p.name AS product_name, p.sku,
                   u.username, d.name AS dept_name
              FROM transactions t
              LEFT JOIN products p  ON t.product_id    = p.id
              LEFT JOIN users u     ON t.user_id        = u.id
              LEFT JOIN departments d ON t.department_id = d.id
             WHERE t.type IN ('issue','return')
             ORDER BY t.transaction_date DESC
             LIMIT 200
        ");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    // ── CSV Template Download ──────────────────────────────────
    case 'csv_template':
        $filePath = __DIR__ . '/csv template/Inventory_Import_Template.csv';
        if (!file_exists($filePath)) {
            http_response_code(404);
            echo json_encode(['error' => 'Template file not found']);
            break;
        }
        if (ob_get_length())
            ob_clean();
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="Inventory_Import_Template.csv"');
        header('Content-Length: ' . filesize($filePath));
        readfile($filePath);
        exit;

    // ── CSV Bulk Import ────────────────────────────────────────
    case 'csv_import':
        $user = authenticate_user($pdo);
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode(['error' => 'POST required']);
            break;
        }

        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $rows = $body['rows'] ?? [];

        if (!is_array($rows) || count($rows) === 0) {
            http_response_code(400);
            echo json_encode(['error' => 'No rows provided']);
            break;
        }

        $imported = 0;
        $skipped = 0;
        $errors = [];

        $pdo->beginTransaction();
        try {
            foreach ($rows as $i => $row) {
                // Flexible column mapping — accepts both the official template headers
                // and the real-world catalog export headers used in the system.

                // Name: "Nomenclature / Equipment Name" | "Asset Name" | "name" | "Name" | "Equipment Name"
                $name = trim(
                    $row['Nomenclature / Equipment Name'] ??
                    $row['Asset Name'] ??
                    $row['Equipment Name'] ??
                    $row['Name'] ??
                    $row['name'] ??
                    ''
                );

                // SKU: "Sec Cat/Part No / Part No / Category Code" | "SKU / Part No" | "SKU" | "Part No" | "sku"
                $sku = trim(
                    $row['Sec Cat/Part No / Part No / Category Code'] ??
                    $row['SKU / Part No'] ??
                    $row['SKU'] ??
                    $row['Part No'] ??
                    $row['sku'] ??
                    ''
                );

                // Barcode: "Barcode / Barcode / QR Code" | "Barcode" | "barcode" | "QR Code"
                $barcode = trim(
                    $row['Barcode / Barcode / QR Code'] ??
                    $row['Barcode'] ??
                    $row['QR Code'] ??
                    $row['barcode'] ??
                    ''
                );

                $categoryN = trim($row['Category'] ?? '');
                $subcatN = trim($row['Sub-Category'] ?? $row['Subcategory'] ?? '');

                // Current stock: "Physical Qty" | "Available Stock" | "System Qty" | "Total Stock"
                $physQty = $row['Physical Qty'] ?? $row['Available Stock'] ?? null;
                $sysQty = $row['System Qty'] ?? $row['Total Stock'] ?? null;
                $currentStk = (int) (
                    ($physQty !== null && $physQty !== '') ? $physQty :
                    (($sysQty !== null && $sysQty !== '') ? $sysQty : 0)
                );

                // Min stock: "Min Stock Level" | "Safety Threshold" | "Min Stock" | "Minimum Stock"
                $minStk = (int) (
                    $row['Min Stock Level'] ??
                    $row['Safety Threshold'] ??
                    $row['Min Stock'] ??
                    $row['Minimum Stock'] ??
                    5
                );

                // UOM: "UOM / Unit of Measure (UOM)" | "UOM" | "Unit"
                $uom = trim(
                    $row['UOM / Unit of Measure (UOM)'] ??
                    $row['UOM'] ??
                    $row['Unit'] ??
                    ''
                );

                // Location: "Location / Store Room" | "Location" | "Store Room" | "location"
                $location = trim(
                    $row['Location / Store Room'] ??
                    $row['Location'] ??
                    $row['Store Room'] ??
                    $row['location'] ??
                    ''
                );
                if ($location === '') {
                    $location = 'Warehouse Main';
                }

                $remarks = trim($row['Remarks'] ?? $row['Notes'] ?? '');

                // Auth / System / Serviceable quantities
                $authQty = (int) ($row['Auth Qty / Authorized Qty'] ?? $row['Auth Qty'] ?? $row['Authorized Qty'] ?? $currentStk);
                $systemQty = (int) ($row['System Qty'] ?? $row['Total Stock'] ?? $currentStk);
                $serviceable = (int) ($row['Serviceable'] ?? $currentStk);
                $unserviceable = (int) ($row['Unserviceable'] ?? 0);
                $condition = trim($row['Condition'] ?? 'Good condition') ?: 'Good condition';
                $repairable = trim($row['Repairable'] ?? 'Yes') ?: 'Yes';
                $issuedTo = trim($row['Issued To'] ?? 'Unassigned') ?: 'Unassigned';
                $issuedBy = trim($row['Issued By'] ?? 'ADM-101') ?: 'ADM-101';

                if ($name === '') {
                    $skipped++;
                    continue;
                }

                // Auto-generate SKU if missing
                if ($sku === '') {
                    $sku = 'SKU-' . strtoupper(substr(md5($name . microtime()), 0, 6));
                }

                // Auto-generate unique barcode if missing
                if ($barcode === '') {
                    $barcode = 'BC-' . strtoupper(substr(md5($sku . $name . uniqid()), 0, 8));
                }

                // Ensure barcode is unique (append suffix if collision)
                $bcCheck = $pdo->prepare("SELECT id FROM products WHERE barcode = ? LIMIT 1");
                $bcCheck->execute([$barcode]);
                if ($bcCheck->fetch()) {
                    $barcode = $barcode . '-' . strtoupper(substr(uniqid(), -4));
                }

                // Auto-create Category if not exists
                $catId = null;
                if ($categoryN !== '') {
                    $stmt = $pdo->prepare("SELECT id FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1");
                    $stmt->execute([$categoryN]);
                    $cat = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($cat) {
                        $catId = (int) $cat['id'];
                    } else {
                        $pdo->prepare("INSERT INTO categories (name) VALUES (?)")->execute([$categoryN]);
                        $catId = (int) $pdo->lastInsertId();
                    }
                }

                // Auto-create Subcategory if not exists
                $subcatId = null;
                if ($subcatN !== '' && $catId !== null) {
                    $stmt = $pdo->prepare("SELECT id FROM subcategories WHERE LOWER(name) = LOWER(?) AND category_id = ? LIMIT 1");
                    $stmt->execute([$subcatN, $catId]);
                    $sub = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($sub) {
                        $subcatId = (int) $sub['id'];
                    } else {
                        $pdo->prepare("INSERT INTO subcategories (category_id, name) VALUES (?,?)")->execute([$catId, $subcatN]);
                        $subcatId = (int) $pdo->lastInsertId();
                    }
                } elseif ($subcatN !== '' && $catId === null) {
                    // subcategory with no category — create a General category
                    $stmt = $pdo->prepare("SELECT id FROM categories WHERE LOWER(name) = 'general' LIMIT 1");
                    $stmt->execute();
                    $cat = $stmt->fetch(PDO::FETCH_ASSOC);
                    if ($cat) {
                        $catId = (int) $cat['id'];
                    } else {
                        $pdo->prepare("INSERT INTO categories (name) VALUES (?)")->execute(['General']);
                        $catId = (int) $pdo->lastInsertId();
                    }
                    $stmt2 = $pdo->prepare("SELECT id FROM subcategories WHERE LOWER(name) = LOWER(?) AND category_id = ? LIMIT 1");
                    $stmt2->execute([$subcatN, $catId]);
                    $sub = $stmt2->fetch(PDO::FETCH_ASSOC);
                    if ($sub) {
                        $subcatId = (int) $sub['id'];
                    } else {
                        $pdo->prepare("INSERT INTO subcategories (category_id, name) VALUES (?,?)")->execute([$catId, $subcatN]);
                        $subcatId = (int) $pdo->lastInsertId();
                    }
                }

                // Upsert product by SKU
                $existing = $pdo->prepare("SELECT id, current_stock FROM products WHERE sku = ? LIMIT 1");
                $existing->execute([$sku]);
                $prod = $existing->fetch(PDO::FETCH_ASSOC);

                if ($prod) {
                    // Update existing product stock & rich fields
                    $pdo->prepare("
                        UPDATE products
                           SET current_stock = ?, min_stock_level = ?, barcode = ?,
                               subcategory_id = ?, uom = ?, auth_qty = ?, system_qty = ?,
                               serviceable_qty = ?, unserviceable_qty = ?, condition = ?,
                               repairable = ?, issued_to = ?, issued_by = ?, location = ?,
                               remarks = ?, updated_at = NOW()
                         WHERE id = ?
                    ")->execute([
                                $currentStk,
                                $minStk,
                                $barcode,
                                $subcatId,
                                $uom,
                                $authQty,
                                $systemQty,
                                $serviceable,
                                $unserviceable,
                                $condition,
                                $repairable,
                                $issuedTo,
                                $issuedBy,
                                $location,
                                $remarks,
                                $prod['id']
                            ]);
                    audit(
                        $pdo,
                        $user['id'],
                        $user['username'],
                        'CSV Import Update',
                        $name,
                        $prod['id'],
                        "Stock: {$prod['current_stock']}",
                        "Stock: {$currentStk}"
                    );
                } else {
                    // Insert new product with all rich fields
                    $pdo->prepare("
                        INSERT INTO products (
                            subcategory_id, name, sku, barcode, min_stock_level, current_stock,
                            uom, auth_qty, system_qty, serviceable_qty, unserviceable_qty,
                            condition, repairable, issued_to, issued_by, location, remarks
                        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                    ")->execute([
                                $subcatId,
                                $name,
                                $sku,
                                $barcode,
                                $minStk,
                                $currentStk,
                                $uom,
                                $authQty,
                                $systemQty,
                                $serviceable,
                                $unserviceable,
                                $condition,
                                $repairable,
                                $issuedTo,
                                $issuedBy,
                                $location,
                                $remarks
                            ]);
                    $newId = (int) $pdo->lastInsertId();
                    audit(
                        $pdo,
                        $user['id'],
                        $user['username'],
                        'CSV Import New Product',
                        $name,
                        $newId,
                        '',
                        "Stock: {$currentStk}"
                    );
                }
                $imported++;
            }

            $pdo->commit();
            echo json_encode(['success' => true, 'imported' => $imported, 'skipped' => $skipped]);
        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Unknown action']);
}
