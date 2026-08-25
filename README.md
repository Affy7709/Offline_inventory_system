# Invendor — Offline Inventory Management System

> A fully offline-capable warehouse inventory system built with **React + Vite** (frontend) and **PHP + PostgreSQL** (backend). Designed to run on a local network — no internet required after setup.

---

## ✨ Features

- 📦 **Product & Category management** with QR code generation
- 🔍 **QR / Barcode scanner** using device camera (mobile-friendly)
- 📊 **Dashboard** with live stock stats and low-stock alerts
- 📋 **Full audit trail** — every stock change logged with user, IP, device
- 🔐 **Secure login** — SHA-256 (client) + bcrypt (server), single-device session lock
- 📱 **Fully responsive** — works on desktop, tablet, and Android/iOS
- 🌐 **100% offline** — no CDN dependencies, all assets bundled locally
- 📄 **Export reports** — PDF and Excel from the Reports page

---

## 🔐 Security Model (Method 3)

```
Browser:  SHA-256( per-user-salt + plaintext_password )  →  sends hash only
Server:   bcrypt( sha256_hex )                           →  stored in DB
Network:  plaintext password NEVER transmitted
```

**Additional protections:**
- Per-user random salt stored in DB (prevents rainbow table attacks)
- bcrypt cost factor 12 (computationally expensive to brute-force)
- Account lockout after 5 failed attempts (15-minute cooldown)
- Single-device session — logging in from a new device kills the old session
- Device fingerprint attached to every request (browser-computed, offline SHA-256)
- Every action (login, logout, stock change, category add) written to `audit_logs`

---

## 🖥️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS v4 |
| Icons | Material Symbols (bundled locally via npm) |
| Backend | PHP 8.x built-in server |
| Database | PostgreSQL 14+ |
| QR Scanning | html5-qrcode |
| Charts | Recharts |
| Export | jsPDF + SheetJS |

---

## 📋 Prerequisites

Install these before starting:

| Tool | Version | Download |
|---|---|---|
| Node.js | 18+ | https://nodejs.org |
| npm | 9+ | (comes with Node) |
| PHP | 8.0+ | https://www.php.net/downloads |
| PostgreSQL | 14+ | https://www.postgresql.org/download |

---

## 🚀 Setup from Scratch

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Set up the database

#### 3a. Create a PostgreSQL database

```sql
-- In psql or pgAdmin:
CREATE DATABASE inventory_db;
```

#### 3b. Run the schema

```bash
psql -U postgres -d inventory_db -f schema.sql
```

> This creates all tables: `users`, `products`, `categories`, `subcategories`, `transactions`, `audit_logs`, `user_tokens`.

### 4. Configure the database connection

```bash
cp config.example.php config.php
```

Edit `config.php` and fill in your PostgreSQL credentials:

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

### 5. Create user accounts

```bash
cp seed_credentials.example.php seed_credentials.php
```

Edit `seed_credentials.php` and set **strong passwords** for each account:

```php
<?php
return [
    ['username' => 'admin',   'password' => 'YourStrongPassword1!', 'role_id' => 1, 'department_id' => 1],
    ['username' => 'manager', 'password' => 'YourStrongPassword2!', 'role_id' => 2, 'department_id' => 3],
    ['username' => 'staff1',  'password' => 'YourStrongPassword3!', 'role_id' => 3, 'department_id' => 4],
    ['username' => 'staff2',  'password' => 'YourStrongPassword4!', 'role_id' => 3, 'department_id' => 2],
];
```

> ⚠️ `seed_credentials.php` is in `.gitignore` and will **never** be committed to GitHub.

Then run the seeder:

```bash
php seed_users.php
```

Expected output:
```
=== Invendor Secure User Seeding ===
Created : admin    OK — salt and bcrypt hash stored securely.
Created : manager  OK — salt and bcrypt hash stored securely.
Created : staff1   OK — salt and bcrypt hash stored securely.
Created : staff2   OK — salt and bcrypt hash stored securely.
=== Done. ===
```

---

## ▶️ Running the Application

You need **two terminals** running simultaneously.

### Terminal 1 — PHP Backend

```bash
php -S 0.0.0.0:8000
```

> Backend available at `http://YOUR_LAN_IP:8000`

### Terminal 2 — React Frontend (Vite dev server)

```bash
npm run dev
```

> Frontend available at `https://YOUR_LAN_IP:5173`

### Find your LAN IP (to access from other devices)

**Windows:**
```bash
ipconfig
# Look for: IPv4 Address . . . . . . . . : 192.168.x.x
```

**Linux/macOS:**
```bash
ip addr show   # or  ifconfig
```

---

## 📱 Accessing from Mobile (Android / iOS)

1. Connect your phone to the **same Wi-Fi network** as the host PC
2. Open Chrome on your phone
3. Navigate to: `https://192.168.x.x:5173`
   - Replace `192.168.x.x` with your PC's LAN IP
4. Accept the self-signed certificate warning (tap **Advanced → Proceed**)
5. On the login page → tap **Server settings** → set API URL to `http://192.168.x.x:8000`

> The frontend uses HTTPS (self-signed cert via `@vitejs/plugin-basic-ssl`) so the camera QR scanner works on mobile. The backend uses HTTP on port 8000.

---

## 🔑 Default Roles

| Role | ID | Description |
|---|---|---|
| Admin | 1 | Full access |
| Manager | 2 | Full access |
| Staff | 3 | Can scan, issue, and return |
| Viewer | 4 | Read-only (future) |

---

## 📁 Project Structure

```
├── components/
│   └── Layout.jsx              # Sidebar + mobile header
├── pages/
│   ├── Login.jsx               # SHA-256 secure login
│   ├── Dashboard.jsx           # Stats, low-stock chart, activity
│   ├── Products.jsx            # Product grid + QR codes
│   ├── Categories.jsx          # Category / subcategory management
│   ├── Scanner.jsx             # QR/barcode scanner + issue/return
│   └── Reports.jsx             # Transactions + Audit log tabs
├── api.js                      # Fetch wrapper (auth token + device fingerprint)
├── App.jsx                     # Router
├── App.css                     # Design system + Tailwind
├── main.jsx                    # Entry point + material-symbols import
├── index.html                  # HTML shell (no CDN links — fully offline)
├── index.php                   # PHP API (all endpoints)
├── db.php                      # DB connection + auto-migration
├── schema.sql                  # PostgreSQL schema
├── seed_users.php              # User seeding script (no passwords inside)
├── seed_credentials.example.php  # ✅ Template — safe to commit
├── seed_credentials.php        # ❌ Your real passwords — gitignored
├── config.example.php          # ✅ DB config template — safe to commit
├── config.php                  # ❌ Your real DB config — gitignored
├── vite.config.js              # Vite + HTTPS + host 0.0.0.0
└── .gitignore                  # Blocks config.php, seed_credentials.php
```

---

## 🔒 Files Blocked from GitHub (`.gitignore`)

These files contain secrets and are **never committed**:

| File | Contains |
|---|---|
| `config.php` | Database host, username, password |
| `seed_credentials.php` | User account plaintext passwords |

Always use the `.example.php` versions as templates.

---

## 🛡️ Audit Log

Every action is recorded in the `audit_logs` table:

- ✅ Successful logins (with IP + device fingerprint)
- ❌ Failed login attempts + account lockouts
- 📦 Product additions and stock changes (before → after values)
- 🗂️ Category and subcategory additions
- 🚪 Logouts

View the full audit trail in the app: **Reports → Audit Log tab** (exportable as PDF).

---

## 🔄 Updating User Passwords

Edit `seed_credentials.php` with new passwords, then:

```bash
php seed_users.php
```

This generates a new salt + bcrypt hash and **invalidates all active sessions** for that user.

---

## 📦 Production Build

To build the frontend for production (served by PHP or nginx):

```bash
npm run build
```

Static files are output to `dist/`. Point your web server at that folder.

---

## 🐛 Troubleshooting

| Problem | Solution |
|---|---|
| Icons showing as text (e.g. `space_dashboard`) | Run `npm install` — material-symbols must be installed |
| Camera not working on mobile | Must use HTTPS (`https://IP:5173`), not HTTP |
| "Cannot connect to server" | Check PHP is running on port 8000, set correct IP in Server settings |
| Login fails after re-seeding | Sessions invalidated — just log in again with new password |
| Database connection error | Check `config.php` credentials and PostgreSQL is running |
| Account locked | Wait 15 minutes or manually run: `UPDATE users SET failed_attempts=0, locked_until=NULL WHERE username='X';` |

---

## 📄 License

MIT — free to use, modify, and distribute.
