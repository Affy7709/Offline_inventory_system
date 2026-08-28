# Invendor — Offline Inventory Management System

> A fully offline-capable warehouse inventory system built with **React + Vite** (frontend) and **PHP + PostgreSQL** (backend). Designed to run on a local network — no internet required after setup.

---

## ✨ Features

- 📦 **Inventory & Stock Management**: Product catalog with SKU, Barcode, UOM, storage location, authorized vs system stock, and live condition tracking.
- 🗂️ **Categories & Subcategories**: Clean 2-column master-detail hierarchy management for taxonomies and nested item groups.
- 🔍 **Barcode & QR Terminal**: Instant product scanning with camera viewfinder and manual lookup for issue and return workflows.
- 📊 **Executive Dashboard**: Real-time KPI summaries, stock-in/stock-out metrics, and low-stock reorder warnings.
- 🔄 **Issues & Returns**: Transaction tracking linked to users and departments with automatic stock adjustments.
- 👥 **Allocations**: Dedicated log for department and user asset assignments.
- 📋 **Full Security Audit Trail**: Every transaction, login, category change, and adjustment logged with user, IP, and device fingerprint.
- 🔐 **Secure Authentic Login**: Bcrypt password hashing (cost factor 12), account lockout protection, and single-device session locking.
- 📥 **CSV Bulk Import & Export**: Import full inventory sheets via CSV template and export live stock reports.
- 📱 **Mobile & Tablet Ready**: Responsive interface accessible across local Wi-Fi.
- 🌐 **100% Offline**: Zero external CDN dependencies; all libraries bundled locally.

---

## 🔐 Security Architecture

- **Password Hashing**: Standard `bcrypt` with cost factor 12 stored in PostgreSQL.
- **Account Lockout**: 5 failed login attempts trigger an automatic 15-minute account lock.
- **Single-Device Session**: Active session tokens are unique per user; logging in from a new device kicks prior active sessions.
- **Hardware/Browser Fingerprinting**: Offline SHA-256 fingerprint generated from browser attributes is verified on every request.
- **Audit Logging**: Every sensitive action (login, logout, stock adjustment, category update) is recorded in `audit_logs`.

---

## 🖥️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS v4 |
| Icons | Lucide React + Material Symbols (bundled locally) |
| Backend | PHP 8.x (Built-in Server or Apache/Nginx) |
| Database | PostgreSQL 14+ |
| Barcode Scanning | html5-qrcode |
| Charts | Recharts |
| Export | jsPDF + SheetJS (XLSX) |

---

## 📋 Prerequisites

Install these before setting up:

| Tool | Minimum Version | Download |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | (included with Node.js) |
| PHP | 8.0+ (with PDO PostgreSQL extension) | https://www.php.net/downloads |
| PostgreSQL | 14+ | https://www.postgresql.org/download |

---

## 🚀 Setup from Scratch

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd Offline_inventory_system
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Set up PostgreSQL Database

#### 3a. Create a database
In `psql` or pgAdmin:
```sql
CREATE DATABASE inventory_db;
```

#### 3b. Run the schema
```bash
psql -U postgres -d inventory_db -f schema.sql
```
> Creates all core tables: `roles`, `departments`, `users`, `categories`, `subcategories`, `products`, `transactions`, `user_tokens`, and `audit_logs`.

---

### 4. Configure Database Connection

Copy the sample configuration:
```bash
cp config.example.php config.php
```

Edit `config.php` and supply your PostgreSQL credentials:
```php
<?php
return [
    'db_host' => '127.0.0.1',
    'db_port' => '5432',
    'db_name' => 'inventory_db',
    'db_user' => 'postgres',
    'db_pass' => 'YOUR_POSTGRES_PASSWORD',
    'cors_allowed_origins' => '*',
];
```

---

### 5. Seed Initial Users & Passwords

Copy the credentials template:
```bash
cp seed_credentials.example.php seed_credentials.php
```

Edit `seed_credentials.php` to set passwords for your accounts:
```php
<?php
return [
    ['username' => 'admin',   'password' => 'YourStrongPassword1!', 'role_id' => 1, 'department_id' => 1],
    ['username' => 'manager', 'password' => 'YourStrongPassword2!', 'role_id' => 2, 'department_id' => 3],
    ['username' => 'staff1',  'password' => 'YourStrongPassword3!', 'role_id' => 3, 'department_id' => 4],
    ['username' => 'staff2',  'password' => 'YourStrongPassword4!', 'role_id' => 3, 'department_id' => 2],
];
```

Run the seeder script:
```bash
php seed_users.php
```

Expected output:
```
=== Invendor Secure User Seeding ===
Updated : admin    OK — bcrypt hash stored securely.
Updated : manager  OK — bcrypt hash stored securely.
Updated : staff1   OK — bcrypt hash stored securely.
=== Done. Passwords are NOT stored here — only in the DB. ===
```

> ⚠️ `config.php` and `seed_credentials.php` are listed in `.gitignore` and will never be committed to Git.

---

## ▶️ Running the Application

You need **two terminal windows** running simultaneously:

### Terminal 1 — PHP Backend
```bash
php -S 0.0.0.0:8000
```
> Backend API accessible at `http://localhost:8000` (or `http://YOUR_LAN_IP:8000`).

### Terminal 2 — React Frontend (Vite)
```bash
npm run dev
```
> Frontend accessible at `https://localhost:5173` (or `https://YOUR_LAN_IP:5173`).

---

## 📱 Accessing from Mobile Devices on Local Network

1. Connect your phone or tablet to the **same Wi-Fi/LAN** as the host computer.
2. Find your host PC's local IP address:
   - **Windows:** Run `ipconfig` (Look for `IPv4 Address`, e.g. `192.168.1.100`)
   - **macOS / Linux:** Run `ifconfig` or `ip addr show`
3. On your mobile browser, open: `https://192.168.1.100:5173`
4. Accept the local SSL certificate warning (**Advanced → Proceed**).
5. On the Login page, click **Server settings** and confirm the API URL points to `http://192.168.1.100:8000`.

---

## 📁 Project Structure

```
├── components/
│   ├── layout/
│   │   ├── Sidebar.jsx              # Main navigation sidebar
│   │   └── Topbar.jsx               # Header bar & user controls
│   ├── dashboard/
│   │   └── StatusDonut.jsx          # Stock status donut chart
│   ├── ui/
│   │   ├── Badge.jsx                # Semantic status badges
│   │   └── Card.jsx                 # Styled card wrapper
│   └── Layout.jsx                   # Master responsive layout wrapper
├── pages/
│   ├── Login.jsx                    # Authentic credential login
│   ├── DashboardPage.jsx            # Inventory metrics & overview charts
│   ├── InventoryPage.jsx            # Complete catalog, stock CRUD & CSV import/export
│   ├── Categories.jsx               # Master categories & subcategories
│   ├── QrPage.jsx                   # Barcode & camera scanning terminal
│   ├── TransactionsPage.jsx         # Issue & return log
│   ├── AllocationsPage.jsx          # User & department allocations
│   ├── ReportsPage.jsx              # Comprehensive PDF/Excel reports
│   └── AuditPage.jsx                # Full security audit log
├── csv template/
│   └── Inventory_Import_Template.csv # Standardized bulk import template
├── api.js                           # API client (tokens + offline fingerprinting)
├── App.jsx                          # React Router configuration
├── App.css                          # Design tokens & styling
├── main.jsx                         # React bootstrap entry point
├── index.html                       # HTML shell
├── index.php                        # PHP REST API Router & Controllers
├── db.php                           # PDO Connection & auto-migrations
├── schema.sql                       # PostgreSQL schema definition
├── seed_users.php                   # User seeder script
├── seed_credentials.example.php     # Template credentials file
├── config.example.php               # Template database config
├── vite.config.js                   # Vite config with HTTPS & host 0.0.0.0
└── .gitignore                       # Git ignore list
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---|---|
| `Database connection unavailable` | Ensure PostgreSQL service is running and verify credentials in `config.php`. |
| `Cannot connect to backend server` | Ensure `php -S 0.0.0.0:8000` is running in Terminal 1. |
| Camera scanner permissions blocked | Access the site via `https://` (camera APIs require secure context). |
| `Account locked. Try again in X minute(s)` | Wait 15 minutes or reset failed attempts: `UPDATE users SET failed_attempts=0, locked_until=NULL WHERE username='admin';` |
| Password update / reset | Edit `seed_credentials.php` and rerun `php seed_users.php`. |

---

## 📄 License

MIT — Free to use, modify, and distribute.
