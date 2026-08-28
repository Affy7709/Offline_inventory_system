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

// Update / Edit product
app.put("/products/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const { product_name, name, category, sub_category, sku, sec_cat_part_no, available_stock, systemQty, min_stock_level, threshold, location, condition, remarks } = req.body;
        const pName = product_name || name;
        const pSku = sku || sec_cat_part_no;
        const pStock = Number(available_stock ?? systemQty ?? 10);
        const pThreshold = Number(min_stock_level ?? threshold ?? 5);

        let updated = { ...req.body, product_id: id };

        if (pool) {
            try {
                const result = await pool.query(
                    `UPDATE products
                     SET product_name = COALESCE($2, product_name),
                         category = COALESCE($3, category),
                         sub_category = COALESCE($4, sub_category),
                         sku = COALESCE($5, sku),
                         available_stock = COALESCE($6, available_stock),
                         min_stock_level = COALESCE($7, min_stock_level),
                         location = COALESCE($8, location)
                     WHERE product_id = $1
                     RETURNING *`,
                    [id, pName, category, sub_category, pSku, pStock, pThreshold, location]
                );
                if (result.rows.length > 0) {
                    updated = result.rows[0];
                }
            } catch (err) {
                console.warn("DB update failed:", err.message);
            }
        }

        io.emit("inventory-update", { product: updated, action: "UPDATE" });
        res.json({ success: true, product: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete product
app.delete("/products/:id", async (req, res) => {
    try {
        const id = req.params.id;

        if (pool) {
            try {
                await pool.query("DELETE FROM products WHERE product_id = $1", [id]);
            } catch (err) {
                console.warn("DB delete failed:", err.message);
            }
        }

        io.emit("inventory-update", { deletedId: id, action: "DELETE" });
        res.json({ success: true, deletedId: id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Scan Stock Action (Direct camera scan to Add or Subtract stock)
app.post("/products/scan-action", async (req, res) => {
    try {
        const { barcode, actionType = "ADD", quantity = 1, adminId = "ADM-101", issuedTo = "Operations" } = req.body;
        const qty = Number(quantity);

        let product = null;

        if (pool) {
            try {
                const searchRes = await pool.query(
                    "SELECT * FROM products WHERE barcode = $1 OR sku = $1 LIMIT 1",
                    [barcode]
                );
                if (searchRes.rows.length > 0) {
                    const found = searchRes.rows[0];
                    const pid = found.product_id;

                    if (actionType === "SUBTRACT" || actionType === "ISSUE") {
                        const upd = await pool.query(
                            `UPDATE products
                             SET available_stock = GREATEST(0, available_stock - $2)
                             WHERE product_id = $1
                             RETURNING *`,
                            [pid, qty]
                        );
                        product = upd.rows[0];

                        await pool.query(
                            `INSERT INTO transactions (product_id, transaction_type, quantity)
                             VALUES ($1, 'ISSUE', $2)`,
                            [pid, qty]
                        );
                    } else {
                        // ADD
                        const upd = await pool.query(
                            `UPDATE products
                             SET available_stock = available_stock + $2
                             WHERE product_id = $1
                             RETURNING *`,
                            [pid, qty]
                        );
                        product = upd.rows[0];

                        await pool.query(
                            `INSERT INTO transactions (product_id, transaction_type, quantity)
                             VALUES ($1, 'STOCK_IN', $2)`,
                            [pid, qty]
                        );
                    }
                }
            } catch (err) {
                console.warn("DB scan-action error:", err.message);
            }
        }

        const payload = {
            barcode,
            actionType,
            quantity: qty,
            issuedBy: adminId,
            product,
        };

        io.emit("inventory-update", payload);
        res.json({ success: true, ...payload });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
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
