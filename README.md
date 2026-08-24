# Step 1 — Offline connectivity test

Goal: prove that an Android phone can connect to your PC over hotspot/LAN,
load a React page, and read/write stock data through PHP into PostgreSQL —
with zero internet involved.

## 1. Turn your PC into a hotspot

**Windows 10/11:** Settings → Network & Internet → Mobile hotspot → turn on.
Note the IP Windows gives itself on that adapter — it's almost always
`192.168.137.1`. Confirm with `ipconfig` (look for "Wireless Network
Connection X" / "Local Area Connection* X").

**Linux:** use your desktop's Wi-Fi settings to create a hotspot, or
`nmcli device wifi hotspot ifname wlan0 ssid Warehouse password yourpass`.
Check the IP with `ip addr show` on the created interface.

**Mac:** System Settings → General → Sharing → Internet Sharing (share your
Ethernet connection over Wi-Fi). Check IP with `ifconfig` on the bridge
interface (often `192.168.2.1`).

Whatever IP you get, that's your PC's address on the hotspot network —
use it everywhere below in place of `192.168.137.1`.

## 2. Set up PostgreSQL

```bash
psql -U postgres -c "CREATE DATABASE inventory_db;"
psql -U postgres -d inventory_db -f schema.sql
```

Edit `backend/api/db.php` with your actual PostgreSQL username/password.

## 3. Run the PHP backend

From `backend/api/`:

```bash
php -S 0.0.0.0:8000
```

`0.0.0.0` is the important part — it makes PHP's built-in server listen on
every network interface, not just the PC itself. From the PC, sanity-check
it works:

```
http://localhost:8000/index.php?action=list
```

## 4. Run the React frontend

From `frontend/`:

```bash
npm install
npm run dev
```

`vite.config.js` already binds this to `0.0.0.0`, so it's reachable from
the phone too.

## 5. Connect the phone

1. Join the phone to your PC's hotspot Wi-Fi.
2. Open a browser on the phone and go to:
   `http://<PC-hotspot-IP>:5173`
3. In the "Backend API address" field at the top, enter:
   `http://<PC-hotspot-IP>:8000`
   and tap **Connect**. This is saved so you don't retype it next time.
4. You should see the two sample stock items load.
5. Change a quantity and tap **Update** — it writes to PostgreSQL through
   PHP, and the refreshed list confirms the round trip worked.

## 6. Confirm it's really offline

Disconnect the PC from the internet (unplug ethernet / disable Wi-Fi
uplink) while keeping the hotspot running, and repeat step 5. If it still
works, your offline chain (phone → hotspot → React → PHP → PostgreSQL) is
fully verified, and you're ready to build out the real frontend and API.

## Notes for the full build

- Right now the API uses `?action=` query params for simplicity. When you
  build out full CRUD, consider proper REST routes instead
  (`/stock`, `/stock/{id}`, etc.) via a lightweight router or `.htaccess`
  if you move to Apache.
- For production on the warehouse PC, swap `php -S` (dev-only) for
  Apache/Nginx + php-fpm, or at minimum keep `php -S 0.0.0.0:8000` running
  via a startup script.
- The React dev server is fine for testing but for daily warehouse use,
  run `npm run build` and serve the static `dist/` folder directly from
  PHP or a lightweight static server — one less moving part, and it starts
  instantly when the PC boots.
