<?php
// ================================================================
//  index.php — Invendor API
//
//  Security model (Method 3):
//    1. Client fetches per-user salt from /get_salt?username=X
//    2. Client computes sha256_hex( salt + plaintext_password )
//    3. Client sends { username, password_hash: sha256_hex }
//    4. Server calls password_verify(sha256_hex, bcrypt_stored)
//    5. Server issues a 64-byte cryptographically random token
//    6. UNIQUE(user_id) in user_tokens enforces single-device login
//    7. Every mutating action writes to audit_logs with device info
// ================================================================

require __DIR__ . '/db.php';

// ── CORS ──────────────────────────────────────────────────────
$origin         = $_SERVER['HTTP_ORIGIN'] ?? '*';
$allowedOrigins = $config['cors_allowed_origins'] ?? '*';

if ($allowedOrigins === '*') {
    header('Access-Control-Allow-Origin: *');
} elseif (is_array($allowedOrigins) && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header('Access-Control-Allow-Origin: ' . (is_string($allowedOrigins) ? $allowedOrigins : '*'));
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Device-Fingerprint');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? '';

// ── Helpers ───────────────────────────────────────────────────

function get_client_ip(): string {
    foreach (['HTTP_CF_CONNECTING_IP','HTTP_X_FORWARDED_FOR','HTTP_X_REAL_IP','REMOTE_ADDR'] as $k) {
        if (!empty($_SERVER[$k])) {
            return explode(',', $_SERVER[$k])[0];
        }
    }
    return '0.0.0.0';
}

function get_device_fingerprint(): string {
    // Sent by the React client (SHA-256 of browser fingerprint)
    return substr(trim($_SERVER['HTTP_X_DEVICE_FINGERPRINT'] ?? ''), 0, 64);
}

function get_auth_token(): ?string {
    $auth = $_SERVER['HTTP_AUTHORIZATION']
        ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION']
        ?? (function_exists('apache_request_headers') ? (apache_request_headers()['Authorization'] ?? '') : '');
    if (preg_match('/Bearer\s+(.+)$/i', $auth, $m)) {
        return trim($m[1]);
    }
    return null;
}

function authenticate_user(PDO $pdo): array {
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
function create_session(PDO $pdo, int $userId, string $deviceFp, string $ip): string {
    $token     = bin2hex(random_bytes(32)); // 64-char hex token
    $expiresAt = date('Y-m-d H:i:s', strtotime('+12 hours'));
    $ua        = substr($_SERVER['HTTP_USER_AGENT'] ?? '', 0, 500);

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
    PDO    $pdo,
    ?int   $userId,
    string $username,
    string $action,
    string $entity    = '',
    ?int   $entityId  = null,
    string $oldValue  = '',
    string $newValue  = ''
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
const LOCKOUT_MINUTES = 15;

// ── Router ────────────────────────────────────────────────────
switch ($action) {

    // ── Login ─────────────────────────────────────────
    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') break;

        $body         = json_decode(file_get_contents('php://input'), true) ?? [];
        $username     = trim($body['username'] ?? '');
        $password     = trim($body['password'] ?? ''); 
        $deviceFp     = get_device_fingerprint() ?: bin2hex(random_bytes(16));
        $ip           = get_client_ip();

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
            $remaining = ceil((strtotime($user['locked_until']) - time()) / 60);
            http_response_code(429);
            echo json_encode(['error' => "Account locked. Try again in $remaining minute(s)."]);
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
                'id'          => $user['id'],
                'username'    => $user['username'],
                'role_id'     => $user['role_id'],
                'role_name'   => $user['role_name'],
                'department_id' => $user['department_id'],
                'dept_name'   => $user['dept_name'],
            ];

            audit($pdo, $user['id'], $username, 'Login successful', 'Session', null, '', '');
            echo json_encode(['success' => true, 'user' => $publicUser, 'token' => $token]);
        } else {
            // Wrong credentials
            if ($user) {
                $fails = $user['failed_attempts'] + 1;
                $lock  = $fails >= MAX_FAILED
                    ? date('Y-m-d H:i:s', strtotime('+' . LOCKOUT_MINUTES . ' minutes'))
                    : null;
                $pdo->prepare("UPDATE users SET failed_attempts=?, locked_until=? WHERE id=?")
                    ->execute([$fails, $lock, $user['id']]);
                audit($pdo, $user['id'], $username, 'Login failed', 'Session', null, '', "Attempt $fails");
            } else {
                audit($pdo, null, $username, 'Login failed — unknown user', 'Session', null, '', '');
            }
            http_response_code(401);
            echo json_encode(['error' => 'Invalid username or password']);
        }
        break;

    // ── Logout ────────────────────────────────────────────────
    case 'logout':
        $user  = authenticate_user($pdo);
        $token = get_auth_token();
        $pdo->prepare("DELETE FROM user_tokens WHERE token = ?")->execute([$token]);
        audit($pdo, $user['id'], $user['username'], 'Logout', 'session');
        echo json_encode(['success' => true]);
        break;

    // ── Check session status (used on app load) ───────────────
    case 'session_check':
        $user = authenticate_user($pdo);
        echo json_encode(['valid' => true, 'user' => [
            'id'          => $user['id'],
            'username'    => $user['username'],
            'role_name'   => $user['role_name'],
            'dept_name'   => $user['dept_name'],
        ]]);
        break;

    // ── Dashboard ─────────────────────────────────────────────
    case 'dashboard':
        $user = authenticate_user($pdo);
        $total    = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
        $lowCount = $pdo->query("SELECT COUNT(*) FROM products WHERE current_stock <= min_stock_level")->fetchColumn();
        $recent   = $pdo->query("
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
            'totalProducts'      => $total,
            'lowStockCount'      => $lowCount,
            'recentTransactions' => $recent,
            'lowStockItems'      => $lowItems,
        ]);
        break;

    // ── Categories ────────────────────────────────────────────
    case 'categories':
        $user = authenticate_user($pdo);
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            echo json_encode($pdo->query("SELECT * FROM categories ORDER BY name")->fetchAll(PDO::FETCH_ASSOC));
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
            $name = trim($body['name'] ?? '');
            if (!$name) { http_response_code(400); echo json_encode(['error' => 'Name required']); break; }
            $pdo->prepare("INSERT INTO categories (name) VALUES (?)")->execute([$name]);
            $id = $pdo->lastInsertId();
            audit($pdo, $user['id'], $user['username'], 'Added category', 'category', (int)$id, '', $name);
            echo json_encode(['success' => true]);
        }
        break;

    // ── Subcategories ─────────────────────────────────────────
    case 'subcategories':
        $user = authenticate_user($pdo);
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            echo json_encode($pdo->query("
                SELECT s.*, c.name AS category_name
                  FROM subcategories s
                  JOIN categories c ON s.category_id = c.id
                 ORDER BY s.name
            ")->fetchAll(PDO::FETCH_ASSOC));
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $body = json_decode(file_get_contents('php://input'), true) ?? [];
            $pdo->prepare("INSERT INTO subcategories (category_id, name) VALUES (?,?)")
                ->execute([$body['category_id'], $body['name']]);
            $id = $pdo->lastInsertId();
            audit($pdo, $user['id'], $user['username'], 'Added subcategory', 'subcategory', (int)$id, '', $body['name']);
            echo json_encode(['success' => true]);
        }
        break;

    // ── Products ──────────────────────────────────────────────
    case 'products':
        $user = authenticate_user($pdo);
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            echo json_encode($pdo->query("
                SELECT p.*, s.name AS subcategory_name
                  FROM products p
                  LEFT JOIN subcategories s ON p.subcategory_id = s.id
                 ORDER BY p.id DESC
            ")->fetchAll(PDO::FETCH_ASSOC));
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $body  = json_decode(file_get_contents('php://input'), true) ?? [];
            $subId = !empty($body['subcategory_id']) ? (int)$body['subcategory_id'] : null;
            $barcode = !empty($body['barcode']) ? $body['barcode'] : 'BC-' . strtoupper(substr(uniqid(), -6));
            $stock = (int)($body['current_stock'] ?? 0);
            $min   = (int)($body['min_stock_level'] ?? 5);

            $pdo->prepare("
                INSERT INTO products (subcategory_id, name, sku, barcode, min_stock_level, current_stock)
                VALUES (?,?,?,?,?,?)
            ")->execute([$subId, $body['name'], $body['sku'], $barcode, $min, $stock]);
            $id = (int)$pdo->lastInsertId();

            audit($pdo, $user['id'], $user['username'], 'Added Product', "{$body['name']} ({$body['sku']})", $id,
                'Stock: 0', "Stock: {$stock}");
            echo json_encode(['success' => true]);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
            if ($user['role_name'] !== 'Admin') {
                http_response_code(403);
                echo json_encode(['error' => 'Permission denied. Admins only.']);
                break;
            }
            $productId = (int)($_GET['id'] ?? 0);
            if (!$productId) {
                http_response_code(400); echo json_encode(['error' => 'Product ID required']); break;
            }
            $stmt = $pdo->prepare("SELECT name, sku, current_stock FROM products WHERE id = ?");
            $stmt->execute([$productId]);
            $prod = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$prod) {
                http_response_code(404); echo json_encode(['error' => 'Product not found']); break;
            }
            $pdo->prepare("DELETE FROM products WHERE id = ?")->execute([$productId]);
            audit($pdo, $user['id'], $user['username'], 'Deleted Product', "{$prod['name']} ({$prod['sku']})", $productId,
                "Stock: {$prod['current_stock']}", 'Product deleted from inventory');
            echo json_encode(['success' => true]);
        }
        break;

    // ── Product lookup by Barcode / SKU ────────────────────────────
    case 'product_by_barcode':
        $user = authenticate_user($pdo);
        $barcode   = trim($_GET['barcode'] ?? '');
        $stmt = $pdo->prepare("
            SELECT p.*, s.name AS subcategory_name
              FROM products p
              LEFT JOIN subcategories s ON p.subcategory_id = s.id
             WHERE p.barcode = ? OR p.sku = ?
        ");
        $stmt->execute([$barcode, $barcode]);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($product) {
            echo json_encode($product);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Product not found']);
        }
        break;

    // ── Transaction (issue / return / add) ───────────────────
    case 'transaction':
        $user = authenticate_user($pdo);
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') break;

        $body      = json_decode(file_get_contents('php://input'), true) ?? [];
        $productId = (int)($body['product_id'] ?? 0);
        $type      = $body['type'] ?? '';
        $qty       = (int)($body['quantity'] ?? 0);
        $deptId    = !empty($body['department_id']) ? (int)$body['department_id'] : $user['department_id'];
        $notes     = substr(trim($body['notes'] ?? ''), 0, 500);

        if (!in_array($type, ['issue','return','add','remove'], true) || $qty < 1 || !$productId) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid transaction parameters']);
            break;
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT id, name, current_stock, min_stock_level FROM products WHERE id = ? FOR UPDATE");
            $stmt->execute([$productId]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            if (!$product) throw new Exception('Product not found');

            $oldStock = (int)$product['current_stock'];
            $newStock = $oldStock;

            if ($type === 'issue' || $type === 'remove') $newStock -= $qty;
            else $newStock += $qty;

            if ($newStock < 0) throw new Exception('Insufficient stock. Available: ' . $oldStock);

            $pdo->prepare("UPDATE products SET current_stock = ?, updated_at = NOW() WHERE id = ?")
                ->execute([$newStock, $productId]);

            $pdo->prepare("
                INSERT INTO transactions (product_id, user_id, department_id, type, quantity, old_stock, new_stock, notes)
                VALUES (?,?,?,?,?,?,?,?)
            ")->execute([$productId, $user['id'], $deptId, $type, $qty, $oldStock, $newStock, $notes]);

            audit(
                $pdo, $user['id'], $user['username'],
                ucfirst($type) . ' Transaction',
                "{$product['name']} ({$product['sku']})", $productId,
                "Stock: {$oldStock}",
                "Stock: {$newStock} (" . ($type === 'issue' || $type === 'remove' ? "-{$qty}" : "+{$qty}") . ")" . ($notes ? " | {$notes}" : "")
            );

            $pdo->commit();
            echo json_encode(['success' => true, 'new_stock' => $newStock]);
        } catch (Exception $e) {
            $pdo->rollBack();
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

    // ── Audit log (full security trail) ──────────────────────
    case 'audit_logs':
        $user = authenticate_user($pdo);
        $stmt = $pdo->query("
            SELECT a.id, a.username, a.action, a.entity, a.entity_id,
                   a.old_value, a.new_value, a.ip_address,
                   a.device_fingerprint, a.timestamp
              FROM audit_logs a
             ORDER BY a.timestamp DESC
             LIMIT 500
        ");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        break;

    // ── Departments ───────────────────────────────────────────
    case 'departments':
        authenticate_user($pdo);
        echo json_encode($pdo->query("SELECT * FROM departments ORDER BY name")->fetchAll(PDO::FETCH_ASSOC));
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
            'stockIn'          => (int)$stockIn,
            'stockOut'         => (int)$stockOut,
            'auditCorrections' => (int)$auditCorrections,
            'products'         => $products,
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

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Unknown action']);
}
