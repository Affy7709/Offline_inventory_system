const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT"]
    }
});

app.use(cors());
app.use(express.json());

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "inventory_demo",
    password: "process.env.DB_PASSWORD",
    port: 5432
});

// Socket connection
io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
    });
});

// Test backend
app.get("/", (req, res) => {
    res.send("Inventory Backend is running!");
});

// Get all products
app.get("/products", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM products ORDER BY product_id"
        );

        res.json(result.rows);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Get product by barcode
app.get("/products/barcode/:barcode", async (req, res) => {
    try {
        const barcode = req.params.barcode;

        const result = await pool.query(
            "SELECT * FROM products WHERE barcode = $1",
            [barcode]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Issue product
app.put("/products/:id/issue", async (req, res) => {
    try {
        const id = req.params.id;
        const qty = Number(req.body?.quantity || 1);
        const adminId = req.body?.adminId || "ADM-101";
        const issuedTo = req.body?.issuedTo || "Assigned Personnel";
        const purpose = req.body?.purpose || "Standard Issue";
        const dateOfIssue = req.body?.dateOfIssue || new Date().toISOString().split("T")[0];
        const timeOfIssue = req.body?.timeOfIssue || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        let updatedProduct = null;
        let transaction = null;

        if (pool) {
            try {
                const result = await pool.query(
                    `UPDATE products
                     SET available_stock = GREATEST(0, available_stock - $2)
                     WHERE product_id = $1
                     AND available_stock >= $2
                     RETURNING *`,
                    [id, qty]
                );

                if (result.rows.length > 0) {
                    updatedProduct = result.rows[0];

                    const transactionResult = await pool.query(
                        `INSERT INTO transactions
                         (product_id, transaction_type, quantity)
                         VALUES ($1, 'ISSUE', $2)
                         RETURNING *`,
                        [id, qty]
                    );

                    transaction = transactionResult.rows[0];
                }
            } catch (dbErr) {
                console.warn("DB update skipped:", dbErr.message);
            }
        }

        const payload = {
            productId: id,
            type: "ISSUE",
            quantity: qty,
            issuedBy: adminId,
            issuedTo: issuedTo,
            purpose: purpose,
            dateOfIssue: dateOfIssue,
            timeOfIssue: timeOfIssue,
            product: updatedProduct,
            transaction: transaction
        };

        // Send real-time update to all connected devices
        io.emit("inventory-update", payload);

        res.json({ success: true, ...payload });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Return product
app.put("/products/:id/return", async (req, res) => {
    try {
        const id = req.params.id;
        const qty = Number(req.body?.quantity || 1);
        const adminId = req.body?.adminId || "ADM-101";
        const returnCondition = req.body?.condition || "Good";
        const dateOfIssue = req.body?.dateOfIssue || new Date().toISOString().split("T")[0];
        const timeOfIssue = req.body?.timeOfIssue || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        let updatedProduct = null;
        let transaction = null;

        if (pool) {
            try {
                const result = await pool.query(
                    `UPDATE products
                     SET available_stock = LEAST(total_stock, available_stock + $2)
                     WHERE product_id = $1
                     RETURNING *`,
                    [id, qty]
                );

                if (result.rows.length > 0) {
                    updatedProduct = result.rows[0];

                    const transactionResult = await pool.query(
                        `INSERT INTO transactions
                         (product_id, transaction_type, quantity)
                         VALUES ($1, 'RETURN', $2)
                         RETURNING *`,
                        [id, qty]
                    );

                    transaction = transactionResult.rows[0];
                }
            } catch (dbErr) {
                console.warn("DB update skipped:", dbErr.message);
            }
        }

        const payload = {
            productId: id,
            type: "RETURN",
            quantity: qty,
            issuedBy: adminId,
            condition: returnCondition,
            dateOfIssue: dateOfIssue,
            timeOfIssue: timeOfIssue,
            product: updatedProduct,
            transaction: transaction
        };

        // Send real-time update to all connected devices
        io.emit("inventory-update", payload);

        res.json({ success: true, ...payload });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Get transaction history
app.get("/transactions", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                t.transaction_id,
                t.product_id,
                p.product_name,
                p.barcode,
                t.transaction_type,
                t.quantity
            FROM transactions t
            JOIN products p
                ON t.product_id = p.product_id
            ORDER BY t.transaction_id DESC
        `);

        res.json(result.rows);

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

// Start server
server.listen(5000, "0.0.0.0", () => {
    console.log("Server running on port 5000");
})
