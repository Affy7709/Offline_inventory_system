<?php
require __DIR__ . '/db.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-User-Id');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$action = $_GET['action'] ?? '';
$userId = $_SERVER['HTTP_X_USER_ID'] ?? null; // simple auth for audit logs

function audit_log($pdo, $userId, $actionDesc, $details = '') {
    if (!$userId) return;
    $stmt = $pdo->prepare("INSERT INTO audit_logs (user_id, action, details) VALUES (?, ?, ?)");
    $stmt->execute([$userId, $actionDesc, $details]);
}

switch ($action) {
    case 'login':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $body = json_decode(file_get_contents('php://input'), true);
            $username = $body['username'] ?? '';
            $password = $body['password'] ?? '';
            $stmt = $pdo->prepare("SELECT u.*, r.name as role_name, d.name as dept_name FROM users u LEFT JOIN roles r ON u.role_id = r.id LEFT JOIN departments d ON u.department_id = d.id WHERE u.username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($user && password_verify($password, $user['password_hash'])) {
                unset($user['password_hash']);
                audit_log($pdo, $user['id'], 'Login', 'User logged in');
                echo json_encode(['success' => true, 'user' => $user]);
            } else {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid credentials']);
            }
        }
        break;

    case 'dashboard':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $totalProducts = $pdo->query("SELECT COUNT(*) FROM products")->fetchColumn();
            $lowStock = $pdo->query("SELECT COUNT(*) FROM products WHERE current_stock <= min_stock_level")->fetchColumn();
            $recentTransactions = $pdo->query("
                SELECT t.*, p.name as product_name, u.username, d.name as dept_name 
                FROM transactions t 
                LEFT JOIN products p ON t.product_id = p.id 
                LEFT JOIN users u ON t.user_id = u.id 
                LEFT JOIN departments d ON t.department_id = d.id 
                ORDER BY t.transaction_date DESC LIMIT 5
            ")->fetchAll(PDO::FETCH_ASSOC);
            $lowStockItems = $pdo->query("SELECT * FROM products WHERE current_stock <= min_stock_level ORDER BY current_stock ASC LIMIT 5")->fetchAll(PDO::FETCH_ASSOC);
            echo json_encode([
                'totalProducts' => $totalProducts,
                'lowStockCount' => $lowStock,
                'recentTransactions' => $recentTransactions,
                'lowStockItems' => $lowStockItems
            ]);
        }
        break;

    case 'categories':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $stmt = $pdo->query("SELECT * FROM categories ORDER BY name");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $body = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("INSERT INTO categories (name) VALUES (?)");
            $stmt->execute([$body['name']]);
            audit_log($pdo, $userId, 'Added Category', $body['name']);
            echo json_encode(['success' => true]);
        }
        break;

    case 'subcategories':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $stmt = $pdo->query("SELECT s.*, c.name as category_name FROM subcategories s JOIN categories c ON s.category_id = c.id ORDER BY s.name");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $body = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("INSERT INTO subcategories (category_id, name) VALUES (?, ?)");
            $stmt->execute([$body['category_id'], $body['name']]);
            audit_log($pdo, $userId, 'Added Subcategory', $body['name']);
            echo json_encode(['success' => true]);
        }
        break;

    case 'products':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $stmt = $pdo->query("SELECT p.*, s.name as subcategory_name FROM products p LEFT JOIN subcategories s ON p.subcategory_id = s.id ORDER BY p.id DESC");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $body = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("INSERT INTO products (subcategory_id, name, sku, qr_code, min_stock_level, current_stock) VALUES (?, ?, ?, ?, ?, ?)");
            
            $subId = !empty($body['subcategory_id']) ? $body['subcategory_id'] : null;
            $qrCode = !empty($body['qr_code']) ? $body['qr_code'] : uniqid('QR-');
            
            $stmt->execute([
                $subId,
                $body['name'],
                $body['sku'],
                $qrCode,
                $body['min_stock_level'] ?? 5,
                $body['current_stock'] ?? 0
            ]);
            audit_log($pdo, $userId, 'Added Product', $body['name']);
            echo json_encode(['success' => true]);
        }
        break;

    case 'product_by_qr':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $qr = $_GET['qr'] ?? '';
            $stmt = $pdo->prepare("SELECT p.*, s.name as subcategory_name FROM products p LEFT JOIN subcategories s ON p.subcategory_id = s.id WHERE p.qr_code = ? OR p.sku = ?");
            $stmt->execute([$qr, $qr]);
            $product = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($product) echo json_encode($product);
            else { http_response_code(404); echo json_encode(['error' => 'Product not found']); }
        }
        break;

    case 'transaction':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $body = json_decode(file_get_contents('php://input'), true);
            $productId = $body['product_id'];
            $type = $body['type']; // 'issue', 'return', 'add'
            $quantity = (int)$body['quantity'];
            $deptId = $body['department_id'] ?? null;
            $notes = $body['notes'] ?? '';

            $pdo->beginTransaction();
            try {
                // Get current stock
                $stmt = $pdo->prepare("SELECT current_stock FROM products WHERE id = ? FOR UPDATE");
                $stmt->execute([$productId]);
                $product = $stmt->fetch(PDO::FETCH_ASSOC);
                
                $newStock = $product['current_stock'];
                if ($type === 'issue') $newStock -= $quantity;
                else if ($type === 'return' || $type === 'add') $newStock += $quantity;
                
                if ($newStock < 0) throw new Exception("Insufficient stock");

                // Update product
                $stmt = $pdo->prepare("UPDATE products SET current_stock = ?, updated_at = NOW() WHERE id = ?");
                $stmt->execute([$newStock, $productId]);

                // Record transaction
                $stmt = $pdo->prepare("INSERT INTO transactions (product_id, user_id, department_id, type, quantity, notes) VALUES (?, ?, ?, ?, ?, ?)");
                $stmt->execute([$productId, $userId, $deptId, $type, $quantity, $notes]);

                audit_log($pdo, $userId, ucfirst($type) . ' Transaction', "Qty: $quantity, Product ID: $productId");

                $pdo->commit();
                echo json_encode(['success' => true, 'new_stock' => $newStock]);
            } catch (Exception $e) {
                $pdo->rollBack();
                http_response_code(400);
                echo json_encode(['error' => $e->getMessage()]);
            }
        }
        break;

    case 'reports':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            // Get all transactions with details for reporting
            $stmt = $pdo->query("
                SELECT t.id, t.type, t.quantity, t.transaction_date, t.notes, 
                       p.name as product_name, p.sku, 
                       u.username, d.name as department_name
                FROM transactions t
                LEFT JOIN products p ON t.product_id = p.id
                LEFT JOIN users u ON t.user_id = u.id
                LEFT JOIN departments d ON t.department_id = d.id
                ORDER BY t.transaction_date DESC
            ");
            echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
        }
        break;

    case 'departments':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            echo json_encode($pdo->query("SELECT * FROM departments ORDER BY name")->fetchAll(PDO::FETCH_ASSOC));
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Unknown action']);
}
