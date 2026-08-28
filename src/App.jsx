import "./App.css";
import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import socket, { BACKEND_URL } from "./socket";

function App() {
  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState(null);
  const [message, setMessage] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [confirmed, setConfirmed] = useState(false);

  const scannerRef = useRef(null);

  const API_URL = BACKEND_URL;

  const OFFLINE_QUEUE_KEY = "inventory_offline_queue";
  const PRODUCTS_CACHE_KEY = "inventory_products_cache";

  // =========================
  // OFFLINE QUEUE
  // =========================

  const getOfflineQueue = () => {
    try {
      const savedQueue = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return savedQueue ? JSON.parse(savedQueue) : [];
    } catch {
      return [];
    }
  };

  const saveOfflineQueue = (queue) => {
    localStorage.setItem(
      OFFLINE_QUEUE_KEY,
      JSON.stringify(queue)
    );
  };

  // =========================
  // PRODUCT CACHE
  // =========================

  const getCachedProducts = () => {
    try {
      const savedProducts = localStorage.getItem(
        PRODUCTS_CACHE_KEY
      );

      return savedProducts
        ? JSON.parse(savedProducts)
        : [];
    } catch {
      return [];
    }
  };

  const loadAndCacheProducts = async () => {
    try {
      const response = await fetch(
        `${API_URL}/products`
      );

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem(
          PRODUCTS_CACHE_KEY,
          JSON.stringify(data)
        );

        console.log("Products cached successfully");
      }
    } catch {
      console.log("Could not update product cache");
    }
  };

  // =========================
  // TRANSACTION HISTORY
  // =========================

  const loadTransactions = async () => {
    try {
      const response = await fetch(
        `${API_URL}/transactions`
      );

      const data = await response.json();

      if (response.ok) {
        setTransactions(data);
      }
    } catch {
      console.log(
        "Could not load transaction history"
      );
    }
  };

  // =========================
  // CHECK BACKEND CONNECTION
  // =========================

  const isBackendAvailable = async () => {
    try {
      const response = await fetch(
        `${API_URL}/`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      return response.ok;
    } catch {
      return false;
    }
  };

  // =========================
  // SEND TRANSACTION TO SERVER
  // =========================

  const sendTransactionToServer = async (
    productId,
    type
  ) => {
    const response = await fetch(
      `${API_URL}/products/${productId}/${type}`,
      {
        method: "PUT",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Transaction failed"
      );
    }

    return data;
  };

  // =========================
  // AUTO SYNC OFFLINE QUEUE
  // =========================

  const syncOfflineTransactions = async () => {
    const queue = getOfflineQueue();

    if (queue.length === 0) {
      return;
    }

    const backendAvailable =
      await isBackendAvailable();

    if (!backendAvailable) {
      console.log(
        "Backend still unavailable. Waiting..."
      );
      return;
    }

    console.log(
      "Backend available. Syncing transactions:",
      queue.length
    );

    const remainingQueue = [];

    for (const transaction of queue) {
      try {
        await sendTransactionToServer(
          transaction.productId,
          transaction.type
        );

        console.log(
          "Transaction synced:",
          transaction
        );
      } catch (error) {
        console.log(
          "Transaction failed to sync:",
          error
        );

        remainingQueue.push(transaction);
      }
    }

    saveOfflineQueue(remainingQueue);

    if (remainingQueue.length === 0) {
      setMessage(
        "Offline transactions synced successfully!"
      );

      await loadTransactions();
      await loadAndCacheProducts();
    }
  };

  // =========================
  // SEARCH PRODUCT
  // ONLINE -> BACKEND
  // OFFLINE -> LOCAL CACHE
  // =========================

  const searchProduct = async (
    code = barcode
  ) => {
    const cleanCode = code.trim();

    if (!cleanCode) {
      setMessage(
        "Please scan or enter a barcode"
      );
      return;
    }

    setConfirmed(false);

    try {
      const response = await fetch(
        `${API_URL}/products/barcode/${encodeURIComponent(
          cleanCode
        )}`
      );

      const data = await response.json();

      if (!response.ok) {
        setProduct(null);

        setMessage(
          data.message || "Product not found"
        );

        return;
      }

      setBarcode(cleanCode);
      setProduct(data);

      setMessage(
        "Product found. Please verify the information."
      );
    } catch {
      const cachedProducts =
        getCachedProducts();

      const cachedProduct =
        cachedProducts.find(
          (item) =>
            String(item.barcode) ===
            cleanCode
        );

      if (cachedProduct) {
        setBarcode(cleanCode);
        setProduct(cachedProduct);

        setMessage(
          "Product found from offline storage. Please verify the information."
        );
      } else {
        setProduct(null);

        setMessage(
          "Product not found in offline storage."
        );
      }
    }
  };

  // =========================
  // CONFIRM PRODUCT
  // =========================

  const confirmProduct = () => {
    setConfirmed(true);

    setMessage(
      "Product confirmed. Select Issue or Return."
    );
  };

  // =========================
  // ISSUE / RETURN
  // =========================

  const handleTransaction = async (type) => {
    if (!product || !confirmed) {
      setMessage(
        "Please confirm the product first."
      );

      return;
    }

    const currentProductId =
      product.product_id;

    try {
      await sendTransactionToServer(
        currentProductId,
        type
      );

      setProduct(null);
      setBarcode("");
      setConfirmed(false);

      if (type === "issue") {
        setMessage(
          "Product issued successfully! You can scan another product."
        );
      } else {
        setMessage(
          "Product returned successfully! You can scan another product."
        );
      }

      await loadTransactions();
      await loadAndCacheProducts();

    } catch {
      // Save transaction locally when PC/backend is unavailable

      const queue = getOfflineQueue();

      const offlineTransaction = {
        id: `${Date.now()}-${Math.random()}`,
        productId: currentProductId,
        barcode: product.barcode,
        type: type,
        createdAt:
          new Date().toISOString(),
      };

      queue.push(offlineTransaction);

      saveOfflineQueue(queue);

      // Update local cached stock

      const cachedProducts =
        getCachedProducts();

      const updatedProducts =
        cachedProducts.map((item) => {
          if (
            item.product_id ===
            currentProductId
          ) {
            let newAvailableStock =
              Number(
                item.available_stock
              );

            if (type === "issue") {
              newAvailableStock =
                Math.max(
                  0,
                  newAvailableStock - 1
                );
            }

            if (type === "return") {
              newAvailableStock =
                Math.min(
                  Number(item.total_stock),
                  newAvailableStock + 1
                );
            }

            return {
              ...item,
              available_stock:
                newAvailableStock,
            };
          }

          return item;
        });

      localStorage.setItem(
        PRODUCTS_CACHE_KEY,
        JSON.stringify(updatedProducts)
      );

      setProduct(null);
      setBarcode("");
      setConfirmed(false);

      setMessage(
        `${
          type === "issue"
            ? "ISSUE"
            : "RETURN"
        } transaction saved offline. It will sync automatically when the PC connection returns.`
      );
    }
  };

  // =========================
  // BARCODE SCANNER
  // =========================

  const startScanner = async () => {
    if (scannerRef.current) {
      return;
    }

    setMessage("");

    const scanner =
      new Html5Qrcode("reader");

    scannerRef.current = scanner;

    try {
      await scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 150,
          },
        },
        async (decodedText) => {
          setBarcode(decodedText);

          await scanner.stop();

          scannerRef.current = null;

          searchProduct(decodedText);
        },
        () => {}
      );
    } catch {
      scannerRef.current = null;

      setMessage(
        "Camera could not be started"
      );
    }
  };

  // =========================
  // RESET
  // =========================

  const resetProduct = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Scanner already stopped
      }

      scannerRef.current = null;
    }

    setBarcode("");
    setProduct(null);
    setConfirmed(false);
    setMessage("");
  };

  // =========================
  // APP START + SOCKET + AUTO SYNC
  // =========================

  useEffect(() => {
    loadTransactions();
    loadAndCacheProducts();
    syncOfflineTransactions();

    socket.on("connect", () => {
      console.log(
        "Socket connected:",
        socket.id
      );

      loadAndCacheProducts();
      syncOfflineTransactions();
    });

    socket.on(
      "inventory-update",
      (data) => {
        console.log(
          "Inventory update received:",
          data
        );

        setProduct(
          (currentProduct) => {
            if (
              currentProduct &&
              data.product.product_id ===
                currentProduct.product_id
            ) {
              return data.product;
            }

            return currentProduct;
          }
        );

        loadTransactions();
        loadAndCacheProducts();
      }
    );

    const handleOnline = () => {
      console.log(
        "Browser reports connection restored."
      );

      loadAndCacheProducts();
      syncOfflineTransactions();
    };

    window.addEventListener(
      "online",
      handleOnline
    );

    // Retry pending offline transactions
    // every 5 seconds
    const syncInterval =
      setInterval(() => {
        syncOfflineTransactions();
      }, 5000);

    return () => {
      socket.off("connect");
      socket.off(
        "inventory-update"
      );

      window.removeEventListener(
        "online",
        handleOnline
      );

      clearInterval(syncInterval);

      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch(() => {});
      }
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <p className="eyebrow">
          INVENTORY MANAGEMENT
        </p>

        <h1>Inventory Scanner</h1>

        <p className="subtitle">
          Scan a barcode, verify the product,
          and confirm the transaction.
        </p>
      </header>

      <section className="panel scanner-section">
        <div className="section-heading">
          <div>
            <span className="step-number">
              1
            </span>

            <h2>
              Scan or Enter Barcode
            </h2>
          </div>

          <p>
            Scan the product barcode or enter
            it manually.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={startScanner}
        >
          Scan Barcode
        </button>

        <div id="reader"></div>

        <div className="divider">
          <span>OR</span>
        </div>

        <div className="manual-search">
          <input
            type="text"
            placeholder="Enter barcode"
            value={barcode}
            onChange={(e) => {
              setBarcode(e.target.value);
              setConfirmed(false);
            }}
          />

          <button
            className="secondary-button"
            onClick={() =>
              searchProduct()
            }
          >
            Search
          </button>
        </div>
      </section>

      {message && (
        <div className="message">
          {message}
        </div>
      )}

      {product && (
        <section className="panel product-card">
          <div className="section-heading product-heading">
            <div>
              <span className="step-number">
                2
              </span>

              <h2>
                Verify Product Information
              </h2>
            </div>

            <button
              className="text-button"
              onClick={() => {
                setProduct(null);
                setConfirmed(false);
                setMessage("");
              }}
            >
              Edit Barcode
            </button>
          </div>

          <div className="product-table-wrapper">
            <table className="product-info-table">
              <tbody>
                <tr>
                  <th>Product Name</th>
                  <td>
                    {product.product_name}
                  </td>
                </tr>

                <tr>
                  <th>Barcode</th>
                  <td>
                    {product.barcode}
                  </td>
                </tr>

                <tr>
                  <th>Total Stock</th>
                  <td>
                    {product.total_stock}
                  </td>
                </tr>

                <tr>
                  <th>Available Stock</th>
                  <td>
                    {product.available_stock}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {!confirmed ? (
            <div className="confirmation-area">
              <p>
                Please verify that this is the
                correct product.
              </p>

              <button
                className="primary-button"
                onClick={confirmProduct}
              >
                Confirm Product
              </button>
            </div>
          ) : (
            <div className="transaction-area">
              <div className="transaction-heading">
                <span className="step-number">
                  3
                </span>

                <div>
                  <h3>
                    Confirm Transaction
                  </h3>

                  <p>
                    Select the action you want
                    to perform.
                  </p>
                </div>
              </div>

              <div className="action-buttons">
                <button
                  className="issue-button"
                  onClick={() =>
                    handleTransaction("issue")
                  }
                >
                  Issue
                </button>

                <button
                  className="return-button"
                  onClick={() =>
                    handleTransaction("return")
                  }
                >
                  Return
                </button>
              </div>
            </div>
          )}

          <button
            className="reset-button"
            onClick={resetProduct}
          >
            Scan Another Product
          </button>
        </section>
      )}

      <section className="panel history-section">
        <div className="section-heading history-heading">
          <h2>
            Transaction History
          </h2>
        </div>

        {transactions.length === 0 ? (
          <div className="empty-state">
            No transactions yet.
          </div>
        ) : (
          <div className="history-table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Barcode</th>
                  <th>Type</th>
                  <th>Quantity</th>
                </tr>
              </thead>

              <tbody>
                {transactions.map(
                  (transaction) => (
                    <tr
                      key={
                        transaction.transaction_id
                      }
                    >
                      <td>
                        {transaction.product_name}
                      </td>

                      <td>
                        {transaction.barcode}
                      </td>

                      <td>
                        <span
                          className={
                            transaction.transaction_type ===
                            "ISSUE"
                              ? "type-badge issue-badge"
                              : "type-badge return-badge"
                          }
                        >
                          {
                            transaction.transaction_type
                          }
                        </span>
                      </td>

                      <td>
                        {transaction.quantity}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default App;