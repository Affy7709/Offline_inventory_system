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
const LOCKOUT_MINUTES = 15;

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
            } else {
                audit($pdo, null, $username, 'Login failed — unknown user', 'Session', null, '', '');
            }
            http_response_code(401);
            echo json_encode(['error' => 'Invalid username or password']);
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
        } elseif ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
            if ($user['role_name'] !== 'Admin') {
                http_response_code(403);
                echo json_encode(['error' => 'Permission denied. Admins only.']);
                break;
            }
            $productId = (int) ($_GET['id'] ?? 0);
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

        if (!in_array($type, ['issue', 'return', 'add', 'remove'], true) || $qty < 1 || !$productId) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid transaction parameters']);
            break;
        }

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT id, name, current_stock, min_stock_level FROM products WHERE id = ? FOR UPDATE");
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

            $pdo->prepare("UPDATE products SET current_stock = ?, updated_at = NOW() WHERE id = ?")
                ->execute([$newStock, $productId]);

            $pdo->prepare("
                INSERT INTO transactions (product_id, user_id, department_id, type, quantity, old_stock, new_stock, notes)
                VALUES (?,?,?,?,?,?,?,?)
            ")->execute([$productId, $user['id'], $deptId, $type, $qty, $oldStock, $newStock, $notes]);

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
            echo json_encode(['success' => true, 'new_stock' => $newStock]);
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
                // Map CSV columns → DB fields
                // CSV: Nomenclature / Equipment Name  → name
                // CSV: Barcode / Barcode / QR Code    → barcode (auto if empty)
                // CSV: Sec Cat/Part No / Part No / Category Code → sku
                // CSV: System Qty or Physical Qty     → current_stock
                // CSV: Min Stock Level                → min_stock_level
                // CSV: Category                       → category name
                // CSV: Sub-Category                   → subcategory name

                $name = trim($row['Nomenclature / Equipment Name'] ?? $row['name'] ?? '');
                $sku = trim($row['Sec Cat/Part No / Part No / Category Code'] ?? $row['sku'] ?? '');
                $barcode = trim($row['Barcode / Barcode / QR Code'] ?? $row['barcode'] ?? '');
                $categoryN = trim($row['Category'] ?? '');
                $subcatN = trim($row['Sub-Category'] ?? '');
                $physQty = $row['Physical Qty'] ?? $row['System Qty'] ?? null;
                $sysQty = $row['System Qty'] ?? $row['Auth Qty / Authorized Qty'] ?? null;
                $currentStk = (int) (($physQty !== null && $physQty !== '') ? $physQty : ($sysQty !== null ? $sysQty : 0));
                $minStk = (int) ($row['Min Stock Level'] ?? 5);
                $uom = trim($row['UOM / Unit of Measure (UOM)'] ?? '');
                $location = trim($row['Location / Store Room'] ?? '');
                $remarks = trim($row['Remarks'] ?? '');
                $authQty = (int) ($row['Auth Qty / Authorized Qty'] ?? $currentStk);
                $systemQty = (int) ($row['System Qty'] ?? $currentStk);
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
