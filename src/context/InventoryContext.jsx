import { createContext, useContext, useState, useEffect } from 'react'
import { products as mockProducts, recentTransactions as mockRecentTransactions, auditLogs as mockAuditLogs } from '../data/mockData'
import socket, { BACKEND_URL } from '../socket'

const InventoryContext = createContext(null)

const STORAGE_KEYS = {
  PRODUCTS: 'northstar_inventory_products',
  TRANSACTIONS: 'northstar_inventory_transactions',
  AUDIT_LOGS: 'northstar_inventory_audit_logs',
  CURRENT_USER: 'northstar_current_user',
}

// Initial default logged-in Admin profile
const DEFAULT_USER = {
  id: 'ADM-101',
  name: 'Anita Shah',
  role: 'System Administrator',
  department: 'Operations & Store',
  email: 'anita.shah@northstar-ops.com',
}

// Helper to format system Date (e.g. "2026-08-28")
export const getSystemDate = () => {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Helper to format system Time (e.g. "06:26:19 AM")
export const getSystemTime = () => {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

// Helper to format full system timestamp (e.g. "2026-08-28 06:26")
export const getSystemTimestamp = () => {
  return `${getSystemDate()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
}

export function InventoryProvider({ children }) {
  // 1. Current Logged-in User / Admin Profile
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
      return saved ? JSON.parse(saved) : DEFAULT_USER
    } catch {
      return DEFAULT_USER
    }
  })

  // 2. Products List (Normalized with available_stock, systemQty, total_stock)
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((p, idx) => {
            const fallbackMock = mockProducts[idx] || {}
            return {
              ...p,
              product_id: p.product_id || p.id || `P-${1001 + idx}`,
              name: p.name || p.product_name || fallbackMock.name || `Asset ${idx + 1}`,
              product_name: p.product_name || p.name || fallbackMock.name || `Asset ${idx + 1}`,
              barcode: p.barcode || fallbackMock.barcode || `89012345${String(idx + 1).padStart(4, '0')}`,
              sku: p.sku || p.secCatPartNo || fallbackMock.sku || `SKU-${1000 + idx}`,
              secCatPartNo: p.secCatPartNo || p.sku || fallbackMock.sku || `SKU-${1000 + idx}`,
              available_stock: Number(p.available_stock ?? p.systemQty ?? p.qty ?? 20),
              systemQty: Number(p.available_stock ?? p.systemQty ?? p.qty ?? 20),
              qty: Number(p.available_stock ?? p.systemQty ?? p.qty ?? 20),
              total_stock: Number(p.total_stock ?? fallbackMock.total_stock ?? 30),
              threshold: Number(p.threshold ?? fallbackMock.threshold ?? 5),
              status: p.status || 'In Stock',
              location: p.location || fallbackMock.location || 'Warehouse Main',
            }
          })
        }
      }
    } catch {
      // Fallback
    }

    return mockProducts.map((p, idx) => ({
      ...p,
      product_id: p.id || `P-${1001 + idx}`,
      serNo: p.serNo || `SER-${1001 + idx}`,
      secCatPartNo: p.sku || p.secCatPartNo || 'N/A',
      barcode: p.barcode || `89012345${String(idx + 1).padStart(4, '0')}`,
      product_name: p.name,
      total_stock: Number(p.total_stock || p.qty || 25),
      available_stock: Number(p.available_stock || p.qty || 20),
      systemQty: Number(p.available_stock || p.qty || 20),
      threshold: Number(p.threshold || 5),
      minStockLevel: Number(p.threshold || 5),
      status: p.status || 'In Stock',
      location: p.location || 'Warehouse Main',
      issuedBy: DEFAULT_USER.id,
      dateOfEntry: getSystemDate(),
      timeEntry: getSystemTime(),
    }))
  })


  // 3. Transactions Log (Detailed records with Issued By Admin ID, System Date, System Time)
  const [transactions, setTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // Fallback
    }

    return mockRecentTransactions.map((tx, idx) => ({
      id: tx.id || `TX-${1030 + idx}`,
      transaction_id: tx.id || `TX-${1030 + idx}`,
      product_id: `P-${1001 + (idx % 5)}`,
      product_name: tx.asset,
      barcode: `89012345${String((idx % 5) + 1).padStart(4, '0')}`,
      transaction_type: tx.type.toUpperCase().includes('ISSUE') ? 'ISSUE' : tx.type.toUpperCase().includes('RETURN') ? 'RETURN' : 'STOCK_IN',
      type: tx.type,
      quantity: tx.qty || 1,
      qty: tx.qty || 1,
      issued_by: `${DEFAULT_USER.id} (${DEFAULT_USER.name})`,
      issuedBy: DEFAULT_USER.id,
      issued_to: tx.user || 'Operations Department',
      date: tx.date || getSystemDate(),
      date_of_issue: tx.date || getSystemDate(),
      time_of_issue: '09:30:00 AM',
      status: tx.status || 'Completed',
      condition: 'Good condition',
      notes: 'Initial recorded transaction',
    }))
  })

  // 4. Audit Logs
  const [auditLogs, setAuditLogs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // Fallback
    }
    return mockAuditLogs
  })

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(currentUser))
    } catch (e) {
      console.warn('Failed to save currentUser to localStorage', e)
    }
  }, [currentUser])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products))
    } catch (e) {
      console.warn('Failed to save products to localStorage', e)
    }
  }, [products])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions))
    } catch (e) {
      console.warn('Failed to save transactions to localStorage', e)
    }
  }, [transactions])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(auditLogs))
    } catch (e) {
      console.warn('Failed to save auditLogs to localStorage', e)
    }
  }, [auditLogs])

  // Try loading live backend state if backend is running
  const fetchBackendData = async () => {
    try {
      const prodRes = await fetch(`${BACKEND_URL}/products`)
      if (prodRes.ok) {
        const data = await prodRes.json()
        if (Array.isArray(data) && data.length > 0) {
          setProducts((prev) => {
            return data.map((item, idx) => {
              const matchedPrev = prev.find((p) => String(p.id || p.product_id) === String(item.product_id))
              return {
                ...matchedPrev,
                ...item,
                id: item.product_id || matchedPrev?.id || `P-${1001 + idx}`,
                product_id: item.product_id || matchedPrev?.product_id || `P-${1001 + idx}`,
                name: item.product_name || item.name || matchedPrev?.name,
                product_name: item.product_name || item.name || matchedPrev?.name,
                barcode: item.barcode || matchedPrev?.barcode || `89012345${String(idx + 1).padStart(4, '0')}`,
                sku: item.sku || item.sec_cat_part_no || matchedPrev?.sku || 'N/A',
                secCatPartNo: item.sec_cat_part_no || item.sku || matchedPrev?.secCatPartNo || 'N/A',
                total_stock: Number(item.total_stock ?? matchedPrev?.total_stock ?? 25),
                available_stock: Number(item.available_stock ?? matchedPrev?.available_stock ?? 20),
                systemQty: Number(item.available_stock ?? matchedPrev?.systemQty ?? 20),
                qty: Number(item.available_stock ?? matchedPrev?.qty ?? 20),
                status: Number(item.available_stock) <= Number(item.min_stock_level || 5) ? 'Low Stock' : (item.status || 'In Stock'),
              }
            })
          })
        }
      }

      const txRes = await fetch(`${BACKEND_URL}/transactions`)
      if (txRes.ok) {
        const txData = await txRes.json()
        if (Array.isArray(txData) && txData.length > 0) {
          setTransactions((prev) => {
            const merged = [...prev]
            txData.forEach((btx) => {
              const exists = merged.some((m) => String(m.id || m.transaction_id) === `TX-${btx.transaction_id}`)
              if (!exists) {
                merged.unshift({
                  id: `TX-${btx.transaction_id}`,
                  transaction_id: `TX-${btx.transaction_id}`,
                  product_id: btx.product_id,
                  product_name: btx.product_name,
                  barcode: btx.barcode,
                  transaction_type: btx.transaction_type,
                  type: btx.transaction_type === 'ISSUE' ? 'Issue' : 'Return',
                  quantity: btx.quantity || 1,
                  qty: btx.quantity || 1,
                  issued_by: btx.issued_by || `${currentUser.id} (${currentUser.name})`,
                  issuedBy: btx.issued_by || currentUser.id,
                  issued_to: btx.issued_to || (btx.transaction_type === 'ISSUE' ? 'Operations' : 'Store Warehouse'),
                  date: btx.date_of_issue || getSystemDate(),
                  date_of_issue: btx.date_of_issue || getSystemDate(),
                  time_of_issue: btx.time_of_issue || getSystemTime(),
                  status: btx.transaction_type === 'ISSUE' ? 'Issued' : 'Returned',
                })
              }
            })
            return merged
          })
        }
      }
    } catch {
      // Backend not running; running in standalone mode
    }
  }

  useEffect(() => {
    fetchBackendData()

    socket.on('inventory-update', (payload) => {
      if (payload?.product) {
        setProducts((prev) =>
          prev.map((p) => {
            if (String(p.product_id || p.id) === String(payload.product.product_id)) {
              return {
                ...p,
                ...payload.product,
                available_stock: Number(payload.product.available_stock),
                systemQty: Number(payload.product.available_stock),
                qty: Number(payload.product.available_stock),
              }
            }
            return p
          })
        )
      }
    })

    return () => {
      socket.off('inventory-update')
    }
  }, [])

  // ==========================================
  // ACTION: ISSUE ASSET
  // - Decrements Available / System Stock
  // - Populates Issued By with Logged-in Admin ID
  // - Populates Date of Issue with System Date
  // - Populates Time of Issue with System Time
  // ==========================================
  const issueAsset = async ({
    productId,
    quantity = 1,
    issuedTo = 'Operations Team',
    purpose = 'Field deployment',
    condition = 'Good condition',
    adminId = currentUser.id,
  }) => {
    const qtyToIssue = Math.max(1, Number(quantity))
    const sysDate = getSystemDate()
    const sysTime = getSystemTime()
    const adminIssuer = adminId || currentUser.id
    const issuerDisplay = `${adminIssuer} (${currentUser.name || 'Admin'})`

    let targetProduct = products.find(
      (p) => String(p.id) === String(productId) || String(p.product_id) === String(productId) || p.name === productId || p.product_name === productId
    )

    if (!targetProduct && products.length > 0) {
      targetProduct = products[0]
    }

    if (!targetProduct) {
      throw new Error('Target product not found')
    }

    const currentStock = Number(targetProduct.available_stock ?? targetProduct.systemQty ?? targetProduct.qty ?? 0)
    if (currentStock < qtyToIssue) {
      throw new Error(`Insufficient stock available (${currentStock} units in stock, requested ${qtyToIssue})`)
    }

    const newStock = Math.max(0, currentStock - qtyToIssue)
    const newStatus = newStock === 0 ? 'Out of Stock' : newStock <= (targetProduct.threshold || targetProduct.minStockLevel || 5) ? 'Low Stock' : 'In Stock'

    // 1. Update Products Available / System Stock
    const updatedProduct = {
      ...targetProduct,
      available_stock: newStock,
      systemQty: newStock,
      qty: newStock,
      status: newStatus,
      issuedTo: issuedTo,
      issuedBy: adminIssuer,
      dateOfExit: sysDate,
    }

    setProducts((prev) =>
      prev.map((p) => (String(p.id) === String(targetProduct.id) || String(p.product_id) === String(targetProduct.product_id) ? updatedProduct : p))
    )

    // 2. Create Transaction Record
    const txId = `TX-${Math.floor(1000 + Math.random() * 9000)}`
    const newTransaction = {
      id: txId,
      transaction_id: txId,
      product_id: targetProduct.product_id || targetProduct.id,
      product_name: targetProduct.product_name || targetProduct.name,
      barcode: targetProduct.barcode || targetProduct.sku,
      transaction_type: 'ISSUE',
      type: 'Issue',
      quantity: qtyToIssue,
      qty: qtyToIssue,
      issued_by: issuerDisplay,
      issuedBy: adminIssuer,
      issued_to: issuedTo,
      date: sysDate,
      date_of_issue: sysDate,
      time_of_issue: sysTime,
      status: 'Issued',
      due: '2026-09-30',
      purpose: purpose,
      condition: condition,
    }

    setTransactions((prev) => [newTransaction, ...prev])

    // 3. Create Audit Log
    const logId = `LOG-${Math.floor(2000 + Math.random() * 8000)}`
    const newAuditLog = {
      id: logId,
      user: `${adminIssuer} (${currentUser.name})`,
      action: `Issued ${qtyToIssue} unit(s) to ${issuedTo}`,
      record: `${targetProduct.product_name || targetProduct.name} (${targetProduct.sku || targetProduct.secCatPartNo || 'N/A'})`,
      time: `${sysDate} ${sysTime}`,
      type: 'Issue',
    }

    setAuditLogs((prev) => [newAuditLog, ...prev])

    // 4. Try sending to backend if online
    try {
      const pid = targetProduct.product_id || targetProduct.id
      await fetch(`${BACKEND_URL}/products/${pid}/issue`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: qtyToIssue,
          issued_by: adminIssuer,
          issued_to: issuedTo,
          date_of_issue: sysDate,
          time_of_issue: sysTime,
        }),
      })
    } catch {
      // Offline fallback
    }

    return { updatedProduct, newTransaction }
  }

  // ==========================================
  // ACTION: RETURN ASSET
  // - Increments Available / System Stock
  // - Populates Issued By with Logged-in Admin ID
  // - Populates Date of Return with System Date
  // - Populates Time of Return with System Time
  // ==========================================
  const returnAsset = async ({
    productId,
    quantity = 1,
    returnedFrom = 'Store Room',
    condition = 'Good condition',
    notes = 'Returned and inspected',
    adminId = currentUser.id,
  }) => {
    const qtyToReturn = Math.max(1, Number(quantity))
    const sysDate = getSystemDate()
    const sysTime = getSystemTime()
    const adminIssuer = adminId || currentUser.id
    const issuerDisplay = `${adminIssuer} (${currentUser.name || 'Admin'})`

    let targetProduct = products.find(
      (p) => String(p.id) === String(productId) || String(p.product_id) === String(productId) || p.name === productId || p.product_name === productId
    )

    if (!targetProduct && products.length > 0) {
      targetProduct = products[0]
    }

    if (!targetProduct) {
      throw new Error('Target product not found')
    }

    const currentStock = Number(targetProduct.available_stock ?? targetProduct.systemQty ?? targetProduct.qty ?? 0)
    const totalStock = Number(targetProduct.total_stock ?? (currentStock + 10))
    const newStock = Math.min(totalStock, currentStock + qtyToReturn)
    const newStatus = newStock > (targetProduct.threshold || targetProduct.minStockLevel || 5) ? 'In Stock' : 'Low Stock'

    // 1. Update Products Available / System Stock
    const updatedProduct = {
      ...targetProduct,
      available_stock: newStock,
      systemQty: newStock,
      qty: newStock,
      status: newStatus,
      condition: condition,
    }

    setProducts((prev) =>
      prev.map((p) => (String(p.id) === String(targetProduct.id) || String(p.product_id) === String(targetProduct.product_id) ? updatedProduct : p))
    )

    // 2. Create Transaction Record
    const txId = `RET-${Math.floor(1000 + Math.random() * 9000)}`
    const newTransaction = {
      id: txId,
      transaction_id: txId,
      product_id: targetProduct.product_id || targetProduct.id,
      product_name: targetProduct.product_name || targetProduct.name,
      barcode: targetProduct.barcode || targetProduct.sku,
      transaction_type: 'RETURN',
      type: 'Return',
      quantity: qtyToReturn,
      qty: qtyToReturn,
      issued_by: issuerDisplay,
      issuedBy: adminIssuer,
      issued_to: returnedFrom,
      date: sysDate,
      date_of_issue: sysDate,
      time_of_issue: sysTime,
      status: 'Returned',
      condition: condition,
      notes: notes,
    }

    setTransactions((prev) => [newTransaction, ...prev])

    // 3. Create Audit Log
    const logId = `LOG-${Math.floor(2000 + Math.random() * 8000)}`
    const newAuditLog = {
      id: logId,
      user: `${adminIssuer} (${currentUser.name})`,
      action: `Logged return of ${qtyToReturn} unit(s) (${condition})`,
      record: `${targetProduct.product_name || targetProduct.name} (${targetProduct.sku || targetProduct.secCatPartNo || 'N/A'})`,
      time: `${sysDate} ${sysTime}`,
      type: 'Return',
    }

    setAuditLogs((prev) => [newAuditLog, ...prev])

    // 4. Try sending to backend if online
    try {
      const pid = targetProduct.product_id || targetProduct.id
      await fetch(`${BACKEND_URL}/products/${pid}/return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity: qtyToReturn,
          issued_by: adminIssuer,
          returned_from: returnedFrom,
          date_of_issue: sysDate,
          time_of_issue: sysTime,
        }),
      })
    } catch {
      // Offline fallback
    }

    return { updatedProduct, newTransaction }
  }

  // ==========================================
  // ACTION: DIRECT STOCK ADJUSTMENT
  // ==========================================
  const adjustStock = ({ productId, quantity, mode = 'ADD' }) => {
    const sysDate = getSystemDate()
    const sysTime = getSystemTime()
    const numQty = Number(quantity)

    let updatedProductResult = null

    setProducts((prev) =>
      prev.map((p) => {
        if (String(p.id) === String(productId) || String(p.product_id) === String(productId) || p.name === productId || p.product_name === productId) {
          const cur = Number(p.available_stock ?? p.systemQty ?? p.qty ?? 0)
          const newQty = mode === 'ADD' ? cur + numQty : Math.max(0, cur - numQty)
          const threshold = Number(p.threshold || p.minStockLevel || 5)
          const updated = {
            ...p,
            available_stock: newQty,
            systemQty: newQty,
            qty: newQty,
            total_stock: Math.max(Number(p.total_stock || 0), newQty),
            status: newQty === 0 ? 'Out of Stock' : newQty <= threshold ? 'Low Stock' : 'In Stock',
          }

          updatedProductResult = updated

          // 1. Add audit log
          setAuditLogs((aPrev) => [
            {
              id: `LOG-${Math.floor(2000 + Math.random() * 8000)}`,
              user: `${currentUser.id} (${currentUser.name})`,
              action: `Stock Adjustment [${mode} +${numQty} units] -> New stock: ${newQty}`,
              record: `${p.product_name || p.name} (${p.sku || p.barcode || 'N/A'})`,
              time: `${sysDate} ${sysTime}`,
              type: 'Adjust',
            },
            ...aPrev,
          ])

          // 2. Add transaction history
          const txId = `TX-${Math.floor(1000 + Math.random() * 9000)}`
          setTransactions((tPrev) => [
            {
              id: txId,
              transaction_id: txId,
              product_id: p.product_id || p.id,
              product_name: p.product_name || p.name,
              barcode: p.barcode || p.sku,
              transaction_type: mode === 'ADD' ? 'STOCK_IN' : 'STOCK_OUT',
              type: mode === 'ADD' ? 'Stock In (+)' : 'Stock Out (-)',
              quantity: numQty,
              qty: numQty,
              issued_by: `${currentUser.id} (${currentUser.name})`,
              issuedBy: currentUser.id,
              issued_to: 'Warehouse Operations',
              date: sysDate,
              date_of_issue: sysDate,
              time_of_issue: sysTime,
              status: 'Completed',
              condition: 'Verified Stock Update',
              notes: `Barcode scan adjustment (+${numQty} units)`,
            },
            ...tPrev,
          ])

          return updated
        }
        return p
      })
    )

    // 3. Try backend sync
    try {
      fetch(`${BACKEND_URL}/products/scan-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode: productId,
          action: mode === 'ADD' ? 'ADD' : 'SUBTRACT',
          quantity: numQty,
          adminId: currentUser.id,
        }),
      }).catch(() => {})
    } catch {}

    return { updatedProduct: updatedProductResult }
  }


  // ==========================================
  // ACTION: ADD NEW PRODUCT
  // ==========================================
  const addProduct = (prodData) => {
    const sysDate = getSystemDate()
    const sysTime = getSystemTime()
    const newId = prodData.id || `P-${1000 + products.length + 1}`
    const fullProd = {
      ...prodData,
      id: newId,
      product_id: newId,
      serNo: prodData.serNo || `SER-${1000 + products.length + 1}`,
      product_name: prodData.name || prodData.product_name,
      available_stock: Number(prodData.available_stock ?? prodData.systemQty ?? prodData.qty ?? 10),
      systemQty: Number(prodData.available_stock ?? prodData.systemQty ?? prodData.qty ?? 10),
      qty: Number(prodData.available_stock ?? prodData.systemQty ?? prodData.qty ?? 10),
      total_stock: Number(prodData.total_stock ?? prodData.authQty ?? 15),
      threshold: Number(prodData.threshold ?? prodData.minStockLevel ?? 5),
      minStockLevel: Number(prodData.threshold ?? prodData.minStockLevel ?? 5),
      issuedBy: currentUser.id,
      dateOfEntry: sysDate,
      timeEntry: sysTime,
    }

    setProducts((prev) => [fullProd, ...prev])

    setAuditLogs((prev) => [
      {
        id: `LOG-${Math.floor(2000 + Math.random() * 8000)}`,
        user: `${currentUser.id} (${currentUser.name})`,
        action: `Added new product to catalog`,
        record: `${fullProd.product_name} (${fullProd.sku || fullProd.secCatPartNo || 'N/A'})`,
        time: `${sysDate} ${sysTime}`,
        type: 'Create',
      },
      ...prev,
    ])

    return fullProd
  }

  // ==========================================
  // ACTION: UPDATE / EDIT EXISTING PRODUCT
  // ==========================================
  const updateProduct = async (productId, updatedFields) => {
    const sysDate = getSystemDate()
    const sysTime = getSystemTime()

    let updatedItem = null

    setProducts((prev) =>
      prev.map((p) => {
        if (String(p.id) === String(productId) || String(p.product_id) === String(productId)) {
          const avail = Number(updatedFields.available_stock ?? updatedFields.systemQty ?? updatedFields.qty ?? p.available_stock)
          const thresh = Number(updatedFields.threshold ?? updatedFields.minStockLevel ?? p.threshold ?? 5)
          const status = avail === 0 ? 'Out of Stock' : avail <= thresh ? 'Low Stock' : (updatedFields.status || 'In Stock')

          updatedItem = {
            ...p,
            ...updatedFields,
            product_name: updatedFields.name || updatedFields.product_name || p.product_name,
            name: updatedFields.name || updatedFields.product_name || p.name,
            available_stock: avail,
            systemQty: avail,
            qty: avail,
            threshold: thresh,
            minStockLevel: thresh,
            status: status,
          }
          return updatedItem
        }
        return p
      })
    )

    // Audit log
    if (updatedItem) {
      setAuditLogs((prev) => [
        {
          id: `LOG-${Math.floor(2000 + Math.random() * 8000)}`,
          user: `${currentUser.id} (${currentUser.name})`,
          action: `Updated product specifications for ${updatedItem.product_name}`,
          record: `${updatedItem.product_name} (${updatedItem.sku || updatedItem.secCatPartNo || 'N/A'})`,
          time: `${sysDate} ${sysTime}`,
          type: 'Adjust',
        },
        ...prev,
      ])

      // Backend sync
      try {
        await fetch(`${BACKEND_URL}/products/${productId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedItem),
        })
      } catch {
        // Offline mode
      }
    }

    return updatedItem
  }

  // ==========================================
  // ACTION: DELETE PRODUCT FROM CATALOG
  // ==========================================
  const deleteProduct = async (productId) => {
    const sysDate = getSystemDate()
    const sysTime = getSystemTime()

    const target = products.find((p) => String(p.id) === String(productId) || String(p.product_id) === String(productId))

    setProducts((prev) =>
      prev.filter((p) => String(p.id) !== String(productId) && String(p.product_id) !== String(productId))
    )

    if (target) {
      setAuditLogs((prev) => [
        {
          id: `LOG-${Math.floor(2000 + Math.random() * 8000)}`,
          user: `${currentUser.id} (${currentUser.name})`,
          action: `Deleted asset from catalog (${target.product_name || target.name})`,
          record: `ID: ${target.id || target.product_id} | SKU: ${target.sku || target.secCatPartNo || 'N/A'}`,
          time: `${sysDate} ${sysTime}`,
          type: 'Adjust',
        },
        ...prev,
      ])

      // Backend sync
      try {
        await fetch(`${BACKEND_URL}/products/${productId}`, {
          method: 'DELETE',
        })
      } catch {
        // Offline mode
      }
    }

    return true
  }

  // ==========================================
  // ACTION: SCAN STOCK ACTION (Direct Add/Subtract on Camera Scan)
  // ==========================================
  const scanStockAction = async ({
    barcode,
    actionType = 'ADD', // 'ADD' | 'SUBTRACT' | 'RETURN'
    quantity = 1,
    adminId = currentUser.id,
    issuedTo = 'Operations Floor',
  }) => {
    const cleanCode = (barcode || '').trim().toLowerCase()
    const targetProduct = products.find(
      (p) =>
        (p.barcode || '').toLowerCase() === cleanCode ||
        (p.secCatPartNo || p.sku || '').toLowerCase() === cleanCode ||
        (p.serNo || p.id || p.product_id || '').toLowerCase() === cleanCode ||
        (p.product_name || p.name || '').toLowerCase() === cleanCode
    )

    if (!targetProduct) {
      throw new Error(`No product found for scanned barcode: "${barcode}"`)
    }

    const pid = targetProduct.product_id || targetProduct.id

    if (actionType === 'SUBTRACT' || actionType === 'ISSUE') {
      return await issueAsset({
        productId: pid,
        quantity: quantity,
        issuedTo: issuedTo,
        purpose: 'Direct Camera Barcode Scan Issue',
        adminId: adminId,
      })
    } else if (actionType === 'RETURN') {
      return await returnAsset({
        productId: pid,
        quantity: quantity,
        returnedFrom: issuedTo,
        condition: 'Good condition',
        adminId: adminId,
      })
    } else {
      // ADD
      adjustStock({
        productId: pid,
        quantity: quantity,
        mode: 'ADD',
      })
      const curStock = Number(targetProduct.available_stock ?? targetProduct.systemQty ?? targetProduct.qty ?? 0)
      return {
        updatedProduct: {
          ...targetProduct,
          available_stock: curStock + Number(quantity),
          systemQty: curStock + Number(quantity),
        },
      }
    }
  }

  // ==========================================
  // ACTION: UPDATE CURRENT USER / ADMIN ID
  // ==========================================
  const updateCurrentUser = (newUserObj) => {
    setCurrentUser((prev) => ({ ...prev, ...newUserObj }))
  }

  return (
    <InventoryContext.Provider
      value={{
        products,
        transactions,
        auditLogs,
        currentUser,
        updateCurrentUser,
        issueAsset,
        returnAsset,
        adjustStock,
        addProduct,
        updateProduct,
        deleteProduct,
        scanStockAction,
        getSystemDate,
        getSystemTime,
        refreshBackendData: fetchBackendData,
      }}
    >
      {children}
    </InventoryContext.Provider>
  )
}

export function useInventory() {
  const context = useContext(InventoryContext)
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider')
  }
  return context
}

