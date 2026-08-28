# Offline Secure Login

Standalone React + PHP + MySQL LAN authentication demo. This project is separate from the parent inventory app.

## Run locally

1. Create the MySQL database with `database/schema.sql`.
2. Update credentials in `api/db.php`.
3. Start PHP from this folder: `php -S 0.0.0.0:8000 -t api`.
4. In another terminal run `npm install` and `npm run dev`.
5. Open the Vite URL on the host PC or another device on the same Wi-Fi network.

For a same-origin production deployment, build the React app and configure Apache to serve the frontend while proxying or placing the PHP files at `/api`.

SHA-256 is used for this demonstration. Its 256-bit digest is represented by 64 hexadecimal characters.
