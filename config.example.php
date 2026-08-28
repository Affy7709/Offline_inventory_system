<?php
// Configuration template - copy this file to config.php and update values
return [
    'db_host' => getenv('DB_HOST') ?: '127.0.0.1',
    'db_port' => getenv('DB_PORT') ?: '5432',
    'db_name' => getenv('DB_NAME') ?: 'inventory_db',
    'db_user' => getenv('DB_USER') ?: 'postgres',
    'db_pass' => getenv('DB_PASS') ?: 'YOUR_DB_PASSWORD_HERE',
    'cors_allowed_origins' => ['http://localhost:5173', 'http://localhost:8000', 'http://127.0.0.1:5173']
];
