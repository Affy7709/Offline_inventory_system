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
s
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

        const result = await pool.query(
            `UPDATE products
             SET available_stock = available_stock - 1
             WHERE product_id = $1
             AND available_stock > 0
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                message: "Product not available"
            });
        }

        const updatedProduct = result.rows[0];

        const transactionResult = await pool.query(
            `INSERT INTO transactions
             (product_id, transaction_type, quantity)
             VALUES ($1, 'ISSUE', 1)
             RETURNING *`,
            [id]
        );

        const transaction = transactionResult.rows[0];

        // Send real-time update to all connected devices
        io.emit("inventory-update", {
            product: updatedProduct,
            transaction: {
                ...transaction,
                product_name: updatedProduct.product_name,
                barcode: updatedProduct.barcode
            }
        });

        res.json(updatedProduct);

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

        const result = await pool.query(
            `UPDATE products
             SET available_stock = available_stock + 1
             WHERE product_id = $1
             AND available_stock < total_stock
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({
                message: "Return not possible"
            });
        }

        const updatedProduct = result.rows[0];

        const transactionResult = await pool.query(
            `INSERT INTO transactions
             (product_id, transaction_type, quantity)
             VALUES ($1, 'RETURN', 1)
             RETURNING *`,
            [id]
        );

        const transaction = transactionResult.rows[0];

        // Send real-time update to all connected devices
        io.emit("inventory-update", {
            product: updatedProduct,
            transaction: {
                ...transaction,
                product_name: updatedProduct.product_name,
                barcode: updatedProduct.barcode
            }
        });

        res.json(updatedProduct);

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
