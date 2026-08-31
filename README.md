# Invendor — Offline Inventory Management System

> A robust, fully offline-capable warehouse and asset inventory management system built with **React + Vite** (frontend) and **PHP + PostgreSQL** (backend). Designed to run securely on a local area network (LAN) — no internet connection required after setup.

---

## ✨ Key Features & Capabilities

- 📦 **Inventory & Stock Management**: Product catalog with SKU, Barcode, UOM, storage location, Authorized Quantity (`auth_qty`), System Quantity, and live stock tracking.
- 🗂️ **Categories & Subcategories**: Clean master-detail hierarchy management for taxonomies and nested item groups.
- 🔍 **Barcode & QR Terminal**: Instant camera-based and USB barcode scanner support for stock lookup, issues, and returns.
- 🔄 **Smart Issue & Return System**:
  - **Multi-Assignee Tracking**: Track multiple simultaneous assignees/departments per product with exact held quantities.
  - **Compulsory Returner Selection**: Dynamic `Returned By` dropdown listing only active holders and their held units.
  - **Return Quota Protection**: Prevents returns of unassigned items and strictly blocks returning more units than were issued or exceeding the product's Authorized Quantity.
- 📊 **Executive Dashboard**: Real-time KPI summaries, stock-in/stock-out metrics, and low-stock reorder warnings.
- 👥 **Allocations & Transactions Log**: Comprehensive historical audit trail linking every stock movement to the exact assignee, operator, and condition notes.
- 🔐 **Security Architecture**:
  - Bcrypt password hashing (cost factor 12) stored in PostgreSQL.
  - Account lockout protection (5 failed attempts trigger 15-minute lock).
  - Hardware/device fingerprint verification for active sessions.
  - Granular audit logging (`audit_logs`) tracking all CRUD, adjustments, and logins.
- 📥 **CSV Bulk Import & Export**: Fast batch ingestion with automatic stock & authorized quantity synchronization.
- 📱 **Mobile & Tablet Ready**: Responsive interface accessible over local Wi-Fi with camera scanner support.
- 🌐 **100% Offline**: Zero external CDN dependencies; all styles, fonts, and icons are bundled locally.

---

## 🖥️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + Vite 5 |
| **Styling** | Tailwind CSS + Custom CSS Design System |
| **Icons & Typography** | Lucide React + Material Symbols + Inter Font (bundled locally) |
| **Backend** | PHP 8.0+ (Built-in Server or Apache/Nginx) with PDO PostgreSQL |
| **Database** | PostgreSQL 14+ |
| **Barcode Scanner** | html5-qrcode (offline bundle) |
| **Export Engines** | SheetJS (XLSX / CSV) + jsPDF |

---

## 📋 Prerequisites

Install the following software before setting up:

| Tool | Minimum Version | Download Link |
|---|---|---|
| **Node.js** | 18.x or higher | https://nodejs.org |
| **npm** | 9.x or higher | (Included with Node.js) |
| **PHP** | 8.0+ (with `pdo_pgsql` enabled) | https://www.php.net/downloads |
| **PostgreSQL** | 14+ | https://www.postgresql.org/download |

> **PHP Extension Tip**: In your `php.ini`, ensure `extension=pdo_pgsql` and `extension=pgsql` are uncommented.

---

## 🚀 Step-by-Step Setup Guide

### 1. Clone or Extract the Project

```bash
cd Offline_inventory_system
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Set Up PostgreSQL Database

#### 3a. Create the Database
In `psql` or pgAdmin:
```sql
CREATE DATABASE inventory_db;
```

#### 3b. Run Schema Migrations
```bash
psql -U postgres -d inventory_db -f schema.sql
```
> This creates all core tables: `roles`, `departments`, `users`, `categories`, `subcategories`, `products`, `transactions`, `user_tokens`, and `audit_logs`.

---

### 4. Configure Database Credentials

Copy the sample configuration file:
```bash
cp config.example.php config.php
```

Edit `config.php` with your PostgreSQL credentials:
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

Run the secure user seeder:
```bash
php seed_users.php
```

Default seeded accounts:
| Username | Role | Default Password |
|---|---|---|
| `admin` | Administrator | `Admin@12345` |
| `manager` | Warehouse Manager | `Manager@12345` |
| `staff1` | Inventory Staff | `Staff@12345` |
| `staff2` | Inventory Staff | `Staff@12345` |

---

## 📦 How to Add & Import Sample Stock (400 Items)

The system includes a pre-configured sample inventory sheet with **400 categorized products** located at:
📁 `csv template/Sample_Stock_400.csv`

### Sample Stock Features:
- **400 Realistic Products**: Covers Computer Hardware, Network Equipment, Office Supplies, Safety Gear, Power Tools, Medical Supplies, and more.
- **Pre-Configured Fields**: Full SKU, unique 12-digit Barcodes, Locations (Aisles A1–E8), UOMs (Units, Pcs, Boxes, Meters, Rolls, Sets), and Min Stock levels.
- **Unassigned Initial State**: All 400 products are initialized with `Issued To = "Unassigned"` to allow testing and demonstration of the live Issue and Return features.
- **Synchronized Authorized Quantity (`auth_qty`)**: Ready out of the box with matching stock limits.

### Step-by-Step Import Instructions:
1. Start both backend and frontend servers (see below).
2. Log into the system at `https://localhost:5173` using `admin` / `Admin@12345`.
3. Navigate to the **Inventory** page from the sidebar.
4. Click the **Import CSV** button on the top right toolbar.
5. Select `csv template/Sample_Stock_400.csv` from the file picker.
6. The system will parse, validate, and import all 400 products into PostgreSQL.
7. You can now search, filter, scan barcodes, and perform stock issue/return workflows immediately.

---

## ▶️ Running the Application

Open **two terminal windows**:

### Terminal 1 — PHP Backend Server
```bash
php -S 0.0.0.0:8000
```
> Accessible locally at `http://localhost:8000` (or `http://<YOUR_LAN_IP>:8000`).

### Terminal 2 — Vite Frontend Development Server
```bash
npm run dev
```
> Accessible at `https://localhost:5173` (or `https://<YOUR_LAN_IP>:5173`).

---

## 📱 Accessing from Mobile/Tablet on Local Wi-Fi

1. Connect your phone/tablet to the **same Wi-Fi/LAN** as your computer.
2. Find your computer's local IP address:
   - **Windows:** Run `ipconfig` (Look for `IPv4 Address`, e.g., `192.168.1.100`)
   - **macOS / Linux:** Run `ifconfig` or `ip addr show`
3. On your mobile browser, open: `https://192.168.1.100:5173`
4. Accept the local SSL certificate prompt (**Advanced → Proceed**).
5. On the login page, tap **Server settings** and ensure the API base URL is set to `http://192.168.1.100:8000`.

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
│   │   ├── Card.jsx                 # Styled card wrapper
│   │   └── AlertContext.jsx         # Global notifications & toasts
│   └── Layout.jsx                   # Master responsive layout wrapper
├── pages/
│   ├── Login.jsx                    # Authentic credential & barcode login
│   ├── DashboardPage.jsx            # Inventory metrics & overview charts
│   ├── InventoryPage.jsx            # Complete catalog, stock CRUD & CSV import/export
│   ├── Categories.jsx               # Master categories & subcategories
│   ├── QrPage.jsx                   # Barcode & camera scanning terminal
│   ├── Scanner.jsx                  # Direct scanner terminal with issue/return controls
│   ├── TransactionsPage.jsx         # Issue & return transaction history log
│   ├── AllocationsPage.jsx          # User & department allocations view
│   ├── ReportsPage.jsx              # Comprehensive PDF/Excel reports
│   └── AuditPage.jsx                # Full security audit log
├── csv template/
│   ├── Sample_Stock_400.csv         # 400 pre-configured test products (Unassigned)
│   └── Inventory_Import_Template.csv# Empty bulk import template
├── api.js                           # Offline-resilient API client & token manager
├── App.jsx                          # React Router routes configuration
├── App.css                          # Design tokens, variables & styling
├── main.jsx                         # React bootstrap entry point
├── index.html                       # HTML entry point
├── index.php                        # PHP REST API Router, Controllers & Business Logic
├── db.php                           # PDO Connection & auto-migrations
├── schema.sql                       # PostgreSQL schema definition
├── seed_users.php                   # User seeder script
├── seed_credentials.example.php     # Template credentials file
├── config.example.php               # Template database config
├── vite.config.js                   # Vite config with HTTPS & host 0.0.0.0
└── .gitignore                       # Git ignore rules
```

---

## 🐛 Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `Database connection unavailable` | PostgreSQL service not running or bad credentials | Check if PostgreSQL service is started and verify `config.php`. |
| `Cannot connect to backend server` | PHP server not running | Ensure `php -S 0.0.0.0:8000` is running in Terminal 1. |
| Camera scanner permissions blocked | Browser requires secure context | Always access the site via `https://` (e.g. `https://localhost:5173`). |
| `Account locked. Try again in X minute(s)` | 5 consecutive failed logins | Wait 15 minutes or reset in PostgreSQL: `UPDATE users SET failed_attempts=0, locked_until=NULL WHERE username='admin';` |
| `Cannot return product: unassigned` | Product has no active assignees | Items must be issued to a person/department before they can be returned. |
| Production Build Verification | Testing production bundle | Run `npm run build` to verify clean bundle compilation. |

---
