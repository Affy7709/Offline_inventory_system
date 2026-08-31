import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Plus, Filter, Download, Upload, X, Package, FileDown, FileUp, Barcode as BarcodeIcon } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { getApiBase, apiFetch, subscribeDataSync } from '../api'
import Barcode from 'react-barcode'

const statusTone = {
  'In Stock': 'success',
  'Issued': 'info',
  'Under Maintenance': 'warning',
  'Low Stock': 'danger',
  'Out of Stock': 'danger',
}

export default function InventoryPage() {
  const [searchParams] = useSearchParams()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [showAddModal, setShowAddModal] = useState(false)
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)

  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user'))
      if (u) setCurrentUser(u)
    } catch { }
  }, [])

  useEffect(() => {
    const query = searchParams.get('q')
    if (query) setSearch(query)
    const cat = searchParams.get('category')
    if (cat) setCategoryFilter(cat)
    const sub = searchParams.get('subcategory')
    if (sub) setCategoryFilter(sub)
  }, [searchParams])

  // Form state
  const [newName, setNewName] = useState('')
  const [newSku, setNewSku] = useState('')
  const [newBarcode, setNewBarcode] = useState('')
  const [newSubcategory, setNewSubcategory] = useState('')
  const [newStock, setNewStock] = useState(10)
  const [newMinStock, setNewMinStock] = useState(5)
  const [newLocation, setNewLocation] = useState('Warehouse Main')
  const [newUom, setNewUom] = useState('Unit')
  const [submitting, setSubmitting] = useState(false)
  const [importStatus, setImportStatus] = useState(null) // { type: 'success'|'error', msg }
  const [importing, setImporting] = useState(false)

  // Edit / Delete flow state
  const [editProduct, setEditProduct] = useState(null)
  const [deleteProductId, setDeleteProductId] = useState(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [modalError, setModalError] = useState('')
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const [toast, setToast] = useState(null) // { type: 'success'|'error'|'info', msg: '' }

  const barcodeRef = useRef(null)

  const showToast = (msg, type = 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  const handleDownloadBarcode = () => {
    if (!barcodeRef.current || !selectedProduct) return
    const svg = barcodeRef.current.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.setAttribute('src', 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData))))
    img.onload = () => {
      const padding = 16
      canvas.width = img.width + padding * 2
      canvas.height = img.height + padding * 2
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, padding, padding)
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `Barcode-${selectedProduct.sku || 'asset'}.png`
      link.href = url
      link.click()
      showToast(`Barcode for ${selectedProduct.sku} downloaded!`, 'success')
    }
  }

  useEffect(() => {
    if (lockoutSeconds <= 0) return
    const timer = setInterval(() => {
      setLockoutSeconds(prev => (prev > 1 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [lockoutSeconds])

  const formatCountdown = (totalSecs) => {
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Pagination state (10 items per page)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    setCurrentPage(1)
  }, [search, categoryFilter, statusFilter])

  const base = getApiBase()

  const loadProducts = async () => {
    try {
      const res = await apiFetch(`${base}/index.php?action=products`)
      const data = await res.json()
      if (Array.isArray(data)) setProducts(data)
    } catch (e) {
      console.error("Error fetching inventory products:", e)
    } finally {
      setLoading(false)
    }
  }

  const loadAll = () => {
    loadProducts()
    apiFetch(`${base}/index.php?action=categories`)
      .then(r => r.json())
      .then(d => setCategories(Array.isArray(d) ? d : []))
      .catch(console.error)
    apiFetch(`${base}/index.php?action=subcategories`)
      .then(r => r.json())
      .then(d => setSubcategories(Array.isArray(d) ? d : []))
      .catch(console.error)
  }

  useEffect(() => {
    loadAll()

    // Real-time cross-device and cross-tab auto-sync
    const unsubscribe = subscribeDataSync(loadAll, 3500)
    return () => unsubscribe()
  }, [base])

  const getProductStatus = (p) => {
    const stock = Number(p.current_stock)
    const min = Number(p.min_stock_level)
    if (stock <= 0) return 'Out of Stock'
    if (stock <= min) return 'Low Stock'
    return 'In Stock'
  }

  const handleAddProduct = async (e) => {
    e.preventDefault()
    if (!newName.trim() || !newSku.trim()) return
    setSubmitting(true)

    try {
      const res = await apiFetch(`${base}/index.php?action=products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          sku: newSku,
          barcode: newBarcode || newSku,
          subcategory_id: newSubcategory || null,
          current_stock: Number(newStock),
          min_stock_level: Number(newMinStock),
          location: newLocation || 'Warehouse Main',
          uom: newUom || 'Unit',
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setShowAddModal(false)
        setNewName('')
        setNewSku('')
        setNewBarcode('')
        setNewSubcategory('')
        setNewStock(10)
        setNewMinStock(5)
        setNewLocation('Warehouse Main')
        setNewUom('Unit')
        showToast('Product added successfully!', 'success')
        loadProducts()
      } else {
        showToast(data.error || 'Failed to add product', 'error')
      }
    } catch {
      showToast('Error connecting to backend server', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setModalError('')
    if (!adminPassword.trim()) {
      setModalError("Admin password is required to edit.")
      return
    }
    setSubmitting(true)
    try {
      const res = await apiFetch(`${base}/index.php?action=products`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editProduct.id,
          name: editProduct.name,
          sku: editProduct.sku,
          barcode: editProduct.barcode,
          subcategory_id: editProduct.subcategory_id,
          current_stock: Number(editProduct.current_stock ?? 0),
          min_stock_level: Number(editProduct.min_stock_level ?? 5),
          location: editProduct.location,
          uom: editProduct.uom,
          condition: editProduct.condition,
          admin_password: adminPassword
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setEditProduct(null)
        setAdminPassword('')
        setModalError('')
        showToast('Product updated successfully!', 'success')
        if (selectedProduct && selectedProduct.id === editProduct.id) {
          setSelectedProduct(null)
        }
        loadProducts()
      } else {
        if (res.status === 429 || data.locked) {
          const secs = data.remaining_seconds || (data.remaining_minutes ? data.remaining_minutes * 60 : 300)
          setLockoutSeconds(secs)
        }
        const errMsg = data.error || 'Failed to edit product'
        setModalError(errMsg)
        showToast(errMsg, 'error')
      }
    } catch {
      setModalError('Error connecting to backend server')
      showToast('Error connecting to backend server', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = async (e) => {
    e.preventDefault()
    setModalError('')
    if (!adminPassword.trim()) {
      setModalError("Admin password is required to delete.")
      return
    }
    setSubmitting(true)
    try {
      const res = await apiFetch(`${base}/index.php?action=products`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: deleteProductId,
          admin_password: adminPassword
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setDeleteProductId(null)
        setAdminPassword('')
        setModalError('')
        showToast('Product deleted successfully!', 'success')
        if (selectedProduct && selectedProduct.id === deleteProductId) {
          setSelectedProduct(null)
        }
        loadProducts()
      } else {
        if (res.status === 429 || data.locked) {
          const secs = data.remaining_seconds || (data.remaining_minutes ? data.remaining_minutes * 60 : 300)
          setLockoutSeconds(secs)
        }
        const errMsg = data.error || 'Failed to delete product'
        setModalError(errMsg)
        showToast(errMsg, 'error')
      }
    } catch {
      setModalError('Error connecting to backend server')
      showToast('Error connecting to backend server', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Download the static inventory import template ──────────
  const handleDownloadTemplate = async () => {
    try {
      const res = await apiFetch(`${base}/index.php?action=csv_template`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'Inventory_Import_Template.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: direct link
      const link = document.createElement('a')
      link.href = `${base}/csv%20template/Inventory_Import_Template.csv`
      link.download = 'Inventory_Import_Template.csv'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  // ─── Export current live inventory as CSV ─────────────────────
  const handleExportCSV = () => {
    const headers = [
      'Ser No / Item ID',
      'Sec Cat/Part No / Part No / Category Code',
      'Barcode / Barcode / QR Code',
      'Nomenclature / Equipment Name',
      'Category',
      'Sub-Category',
      'UOM / Unit of Measure (UOM)',
      'Auth Qty / Authorized Qty',
      'System Qty',
      'Physical Qty',
      'Serviceable',
      'Unserviceable',
      'Condition',
      'Status',
      'Repairable',
      'Issued To',
      'Issued By',
      'Location / Store Room',
      'Min Stock Level',
      'Date of Entry / Last Updated',
      'Date of Exit',
      'Time Entry',
      'Remarks',
    ]

    const rows = products.map((p, idx) => [
      idx + 1,               // Ser No
      p.sku,                 // Part No / SKU
      p.barcode || '',       // Barcode
      p.name,                // Nomenclature / Equipment Name
      p.category_name || '', // Category
      p.subcategory_name || '', // Sub-Category
      p.uom || '',           // UOM
      p.auth_qty ?? p.current_stock,   // Auth Qty
      p.system_qty ?? p.current_stock, // System Qty
      p.current_stock,       // Physical Qty
      p.serviceable_qty ?? p.current_stock, // Serviceable
      p.unserviceable_qty ?? 0,             // Unserviceable
      p.condition || 'Good condition',      // Condition
      getProductStatus(p),   // Status
      p.repairable || 'Yes', // Repairable
      p.issued_to || 'Unassigned', // Issued To
      p.issued_by || '',     // Issued By
      p.location || '',      // Location / Store Room
      p.min_stock_level,     // Min Stock Level
      (p.updated_at || new Date().toISOString()).split('T')[0],  // Date
      '',                    // Date of Exit
      '',                    // Time Entry
      p.remarks || '',       // Remarks
    ])

    const csv = [headers, ...rows]
      .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Inventory_Export_${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // ─── Parse & upload CSV file ──────────────────────────────────
  const handleImportCSV = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // reset input
    if (!file) return

    setImporting(true)
    setImportStatus(null)

    try {
      const text = await file.text()
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      if (lines.length < 2) {
        setImportStatus({ type: 'error', msg: 'CSV file is empty or has no data rows.' })
        return
      }

      // Parse header and rows
      const parseCSVLine = (line) => {
        const result = []
        let current = ''
        let inQuotes = false
        for (let ci = 0; ci < line.length; ci++) {
          const ch = line[ci]
          if (ch === '"') {
            if (inQuotes && line[ci + 1] === '"') { current += '"'; ci++; }
            else { inQuotes = !inQuotes }
          } else if (ch === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += ch
          }
        }
        result.push(current.trim())
        return result
      }

      const headers = parseCSVLine(lines[0])
      const rows = lines.slice(1).map(line => {
        const vals = parseCSVLine(line)
        const obj = {}
        headers.forEach((h, i) => { obj[h] = vals[i] ?? '' })
        return obj
      }).filter(r => Object.values(r).some(v => v !== ''))

      if (rows.length === 0) {
        setImportStatus({ type: 'error', msg: 'No valid data rows found in the CSV.' })
        return
      }

      const res = await apiFetch(`${base}/index.php?action=csv_import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()

      if (res.ok && data.success) {
        setImportStatus({ type: 'success', msg: `Successfully imported ${data.imported} product(s). Skipped: ${data.skipped}.` })
        loadProducts()
      } else {
        setImportStatus({ type: 'error', msg: data.error || 'Import failed.' })
      }
    } catch (err) {
      setImportStatus({ type: 'error', msg: 'Failed to read or parse the CSV file.' })
    } finally {
      setImporting(false)
    }
  }

  const handleQuickStockChange = async (e, productId, changeType, deltaQty = 1) => {
    if (e) e.stopPropagation()
    try {
      const res = await apiFetch(`${base}/index.php?action=transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(productId),
          type: changeType === 'add' ? 'add' : 'remove',
          quantity: deltaQty,
          notes: `Quick Stock ${changeType === 'add' ? 'In' : 'Out'} from Inventory Manager`
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, current_stock: data.new_stock } : p))
        if (selectedProduct && selectedProduct.id === productId) {
          setSelectedProduct(prev => ({ ...prev, current_stock: data.new_stock }))
        }
        showToast(`Stock updated to ${data.new_stock} units`, 'success')
      } else {
        showToast(data.error || 'Failed to update stock', 'error')
      }
    } catch {
      showToast('Error updating stock on server', 'error')
    }
  }

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !search || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.barcode?.toLowerCase().includes(q)
    const matchCat = categoryFilter === 'All categories' || p.subcategory_name === categoryFilter || p.category_name === categoryFilter
    const status = getProductStatus(p)
    const matchStatus = statusFilter === 'All statuses' || status === statusFilter
    return matchSearch && matchCat && matchStatus
  })

  // Stock summary metrics
  const totalStockUnits = products.reduce((acc, p) => acc + (Number(p.current_stock) || 0), 0)
  const lowStockCount = products.filter(p => Number(p.current_stock) <= Number(p.min_stock_level)).length
  const healthyStockCount = products.filter(p => Number(p.current_stock) > Number(p.min_stock_level)).length

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedProducts = filtered.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      {/* Stock Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Products</p>
          <div className="mt-2 text-2xl font-bold text-slate-900">{products.length}</div>
          <p className="mt-1 text-xs text-slate-400">Registered catalog items</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Stock On Hand</p>
          <div className="mt-2 text-2xl font-bold text-emerald-600">{totalStockUnits} <span className="text-xs text-slate-500 font-normal">units</span></div>
          <p className="mt-1 text-xs text-slate-400">Combined warehouse inventory</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Healthy Stock</p>
          <div className="mt-2 text-2xl font-bold text-slate-900">{healthyStockCount}</div>
          <p className="mt-1 text-xs text-emerald-600 font-medium">Above safety threshold</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Low Stock Alerts</p>
          <div className={`mt-2 text-2xl font-bold ${lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{lowStockCount}</div>
          <p className="mt-1 text-xs text-rose-500 font-medium">Requires reorder / stock in</p>
        </div>
      </div>

      {/* Header & Controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Unified Management</p>
            <h2 className="text-2xl font-semibold text-slate-900">Inventory & Stock Console</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Download Template */}
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              title="Download blank import template"
            >
              <FileDown size={15} className="text-slate-500" />
              Template
            </button>

            {/* Import CSV */}
            <label className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 transition cursor-pointer">
              <Upload size={15} />
              {importing ? 'Importing…' : 'Import CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={handleImportCSV} disabled={importing} />
            </label>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-800 hover:bg-blue-100 transition"
            >
              <FileUp size={15} />
              Export CSV
            </button>

            {/* Add Product */}
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition shadow-soft"
            >
              <Plus size={16} />
              Add Product
            </button>
          </div>
        </div>

        {/* Import status feedback */}
        {importStatus && (
          <div className={`mt-3 flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-medium border ${importStatus.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
            <span>{importStatus.type === 'success' ? '✓' : '⚠'} {importStatus.msg}</span>
            <button onClick={() => setImportStatus(null)} className="text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {/* Filter bar */}
        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
            <Search size={16} />
            <input
              className="w-full bg-transparent outline-none text-slate-900"
              placeholder="Search products, SKU, or barcode…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option>All statuses</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Catalog & Live Stock Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Asset & Nomenclature</th>
                <th className="px-4 py-3 font-medium">SKU / Barcode</th>
                <th className="px-4 py-3 font-medium">Category / Sub</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium text-center">Stock (Phys / Auth)</th>
                <th className="px-4 py-3 font-medium">Condition & Status</th>
                <th className="px-4 py-3 font-medium">Issued To</th>
                <th className="px-4 py-3 font-medium text-center">Barcode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading inventory catalog…</td>
                </tr>
              ) : paginatedProducts.length > 0 ? (
                paginatedProducts.map((product) => {
                  const status = getProductStatus(product)
                  return (
                    <tr key={product.id} onClick={() => setSelectedProduct(product)} className="hover:bg-slate-50/80 transition cursor-pointer">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                            <BarcodeIcon size={18} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{product.name}</div>
                            {product.uom && <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">UOM: {product.uom}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        <div className="text-slate-900 font-semibold">{product.sku}</div>
                        <div className="text-slate-500 text-[11px]">{product.barcode || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-slate-800">{product.category_name || 'General'}</div>
                        <div className="text-slate-500">{product.subcategory_name || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {product.location ? (
                          <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                            📍 {product.location}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-base font-bold ${Number(product.current_stock) <= Number(product.min_stock_level) ? 'text-rose-600' : 'text-slate-900'}`}>
                          {product.current_stock}
                        </span>
                        <span className="text-xs text-slate-400 font-normal"> / {product.auth_qty || '—'} auth</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <Badge tone={statusTone[status] || 'default'}>{status}</Badge>
                          {product.condition && (
                            <span className="text-[10px] text-slate-500 font-medium">{product.condition}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {product.issued_to && product.issued_to !== 'Unassigned' ? (
                          <span className="text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            👤 {product.issued_to}
                          </span>
                        ) : (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-200 transition">
                          <BarcodeIcon size={12} className="text-emerald-600" />
                          Scan
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">No products found. Click "Add Product" or "Import CSV" to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-slate-50/50 text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold text-slate-900">{startIndex + 1}</span> to{' '}
              <span className="font-semibold text-slate-900">{Math.min(startIndex + itemsPerPage, filtered.length)}</span> of{' '}
              <span className="font-semibold text-slate-900">{filtered.length}</span> products
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-40 disabled:hover:bg-white"
              >
                Previous
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, idx, arr) => {
                    const prevPage = arr[idx - 1]
                    const showEllipsis = prevPage && page - prevPage > 1
                    return (
                      <span key={page} className="flex items-center gap-1">
                        {showEllipsis && <span className="px-1 text-slate-400">…</span>}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(page)}
                          className={`min-w-8 h-8 px-2 rounded-lg font-bold transition ${currentPage === page
                              ? 'bg-slate-900 text-white shadow-soft'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                        >
                          {page}
                        </button>
                      </span>
                    )
                  })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-40 disabled:hover:bg-white"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Product Modal Card — Responsive Rectangular Format */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-6" onClick={() => setSelectedProduct(null)}>
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Modal Rectangular Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="rounded-lg bg-emerald-500/20 px-2.5 py-0.5 text-xs font-mono font-bold text-emerald-300 border border-emerald-500/30">
                    {selectedProduct.sku}
                  </span>
                  {selectedProduct.uom && (
                    <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-semibold text-slate-300 border border-slate-700">
                      UOM: {selectedProduct.uom}
                    </span>
                  )}
                  <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-medium text-slate-400 border border-slate-700">
                    {selectedProduct.category_name || 'General'}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">{selectedProduct.name}</h2>
                <p className="text-xs text-slate-400">Location: <span className="text-slate-200 font-medium">{selectedProduct.location || 'Warehouse Main'}</span></p>
              </div>

              {/* Barcode & Close Button */}
              <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
                <div className="bg-white p-2.5 rounded-xl shadow-md border border-slate-200 flex justify-center items-center">
                  <Barcode value={selectedProduct.barcode || selectedProduct.sku || 'N/A'} width={1.4} height={36} displayValue={true} fontSize={10} margin={0} />
                </div>
                <button 
                  onClick={() => setSelectedProduct(null)} 
                  className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition"
                  title="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 space-y-5 overflow-y-auto bg-slate-50 flex-1">
              {/* Barcode Download Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex items-center gap-2">
                    <BarcodeIcon size={16} className="text-emerald-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">Asset Barcode</span>
                  </div>
                  <div ref={barcodeRef} className="p-2.5 bg-white rounded-xl shadow-xs border border-slate-200 flex justify-center items-center overflow-hidden">
                    <Barcode 
                      value={selectedProduct.barcode || selectedProduct.sku || 'N/A'} 
                      width={1.6} 
                      height={48} 
                      displayValue={true} 
                      fontSize={11} 
                      margin={0} 
                    />
                  </div>
                  <div className="text-[11px] font-mono text-slate-500 font-medium">Code: {selectedProduct.barcode || selectedProduct.sku}</div>
                  <button
                    onClick={handleDownloadBarcode}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 px-4 py-1.5 text-xs font-semibold transition"
                  >
                    <Download size={13} />
                    Download Barcode (PNG)
                  </button>
                </div>
              </div>

              {/* 4 Quantities Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Physical Stock</div>
                  <div className={`text-2xl font-extrabold mt-1 ${Number(selectedProduct.current_stock) <= Number(selectedProduct.min_stock_level) ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {selectedProduct.current_stock}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Min threshold: {selectedProduct.min_stock_level}</div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Authorized Qty</div>
                  <div className="text-2xl font-extrabold text-slate-800 mt-1">{selectedProduct.auth_qty || selectedProduct.current_stock}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Approved quota</div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Balance</div>
                  <div className="text-2xl font-extrabold text-slate-800 mt-1">{selectedProduct.system_qty || selectedProduct.current_stock}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Catalog record</div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serviceable Qty</div>
                  <div className="text-2xl font-extrabold text-blue-600 mt-1">{selectedProduct.serviceable_qty || selectedProduct.current_stock}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Ready for deployment</div>
                </div>
              </div>

              {/* Extended Details Grid (2 Columns Responsive) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs text-slate-700 shadow-xs">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-2">Classification & Storage</h4>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Category</span>
                    <span className="font-semibold text-slate-900">{selectedProduct.category_name || 'General'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Sub-Category</span>
                    <span className="font-semibold text-slate-900">{selectedProduct.subcategory_name || '—'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Location / Room</span>
                    <span className="font-semibold text-slate-900">{selectedProduct.location || 'Warehouse Main'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-medium">Unit of Measure (UOM)</span>
                    <span className="font-semibold text-slate-900">{selectedProduct.uom || 'Unit'}</span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs text-slate-700 shadow-xs">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-2">Condition & Custody</h4>
                  <div className="flex justify-between py-1 border-b border-slate-100 items-center">
                    <span className="text-slate-500 font-medium">Operational Status</span>
                    <Badge tone={statusTone[getProductStatus(selectedProduct)] || 'default'}>{getProductStatus(selectedProduct)}</Badge>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100 items-center">
                    <span className="text-slate-500 font-medium">Asset Condition</span>
                    <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{selectedProduct.condition || 'Good condition'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">Currently Issued To</span>
                    <span className="font-semibold text-slate-900">{selectedProduct.issued_to || 'Unassigned'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-medium">Last Recorded Issuer</span>
                    <span className="font-semibold text-slate-900">{selectedProduct.issued_by || 'ADM-101'}</span>
                  </div>
                </div>
              </div>

              {selectedProduct.remarks && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-slate-500 font-medium text-xs block mb-1.5">Asset Remarks / Log Notes</span>
                  <p className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-700 font-mono text-xs leading-relaxed">{selectedProduct.remarks}</p>
                </div>
              )}
            </div>

            {/* Modal Rectangular Footer */}
            {currentUser?.role_name === 'Admin' && (
              <div className="p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-end gap-2.5 shrink-0">
                <button
                  onClick={() => {
                    setDeleteProductId(selectedProduct.id)
                    setAdminPassword('')
                    setModalError('')
                  }}
                  className="rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition"
                >
                  Delete Asset
                </button>
                <button
                  onClick={() => {
                    setEditProduct({ ...selectedProduct })
                    setAdminPassword('')
                    setModalError('')
                  }}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition shadow-soft"
                >
                  Edit Product Details
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Product Modal — Responsive Rectangular Format */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-6" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white">Register New Inventory Asset</h3>
                <p className="text-xs text-slate-400">Add a product to catalog and set initial stock</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto bg-slate-50 flex-1 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column */}
                  <div className="space-y-3.5 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-2">Basic Info & Identification</h4>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-xs">Product / Asset Name *</label>
                      <input
                        type="text"
                        required
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                        placeholder="e.g. Dell Latitude 5420"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">SKU / Part No *</label>
                        <input
                          type="text"
                          required
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 font-mono text-xs"
                          placeholder="DL-5420-14"
                          value={newSku}
                          onChange={e => setNewSku(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">Barcode / QR</label>
                        <input
                          type="text"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 font-mono text-xs"
                          placeholder="Auto if empty"
                          value={newBarcode}
                          onChange={e => setNewBarcode(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-xs">Category & Subcategory</label>
                      <select
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 bg-white text-xs"
                        value={newSubcategory}
                        onChange={e => setNewSubcategory(e.target.value)}
                      >
                        <option value="">General / Uncategorized</option>
                        {subcategories.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.category_name})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-3.5 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-2">Stock & Storage Parameters</h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">Initial Physical Stock *</label>
                        <input
                          type="number"
                          min="0"
                          required
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 font-bold"
                          value={newStock}
                          onChange={e => setNewStock(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">Min Safety Threshold *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
                          value={newMinStock}
                          onChange={e => setNewMinStock(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">Location / Room</label>
                        <input
                          type="text"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 text-xs"
                          placeholder="Warehouse Main"
                          value={newLocation}
                          onChange={e => setNewLocation(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">Unit of Measure (UOM)</label>
                        <input
                          type="text"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 text-xs"
                          placeholder="Unit"
                          value={newUom}
                          onChange={e => setNewUom(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 shadow-soft"
                >
                  {submitting ? 'Saving…' : 'Create Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal — Responsive Rectangular Format */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-6" onClick={() => { setEditProduct(null); setModalError(''); }}>
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Product & Stock Record</h3>
                <p className="text-xs text-slate-400">SKU: <span className="font-mono text-emerald-400">{editProduct.sku}</span></p>
              </div>
              <button onClick={() => { setEditProduct(null); setModalError(''); }} className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto bg-slate-50 flex-1 text-sm">
                {/* Live Error and Lockout Banner */}
                {modalError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium animate-in fade-in flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-600 shrink-0 animate-pulse" />
                      <span className="font-semibold">{modalError}</span>
                    </div>
                    {lockoutSeconds > 0 && (
                      <div className="mt-1 flex items-center justify-between bg-white/90 p-2 rounded-lg border border-rose-200">
                        <span className="text-slate-600 font-medium flex items-center gap-1">
                          ⏱️ Security Lockout Active:
                        </span>
                        <span className="font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-xs tracking-wider">
                          {formatCountdown(lockoutSeconds)} remaining
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 2-Column Responsive Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Nomenclature & Identification */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-2">Asset Identification</h4>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-xs">Product Name *</label>
                      <input
                        type="text"
                        required
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
                        value={editProduct.name || ''}
                        onChange={e => setEditProduct({...editProduct, name: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">SKU / Part No *</label>
                        <input
                          type="text"
                          required
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 font-mono text-xs"
                          value={editProduct.sku || ''}
                          onChange={e => setEditProduct({...editProduct, sku: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">Barcode / QR</label>
                        <input
                          type="text"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 font-mono text-xs"
                          value={editProduct.barcode || ''}
                          onChange={e => setEditProduct({...editProduct, barcode: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-xs">Category & Subcategory</label>
                      <select
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 bg-white text-xs"
                        value={editProduct.subcategory_id || ''}
                        onChange={e => setEditProduct({...editProduct, subcategory_id: e.target.value})}
                      >
                        <option value="">General / Uncategorized</option>
                        {subcategories.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.category_name})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right Column: Stock, Location & Status */}
                  <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-100 pb-2">Stock & Condition</h4>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">Physical Stock *</label>
                        <input
                          type="number"
                          min="0"
                          required
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 font-bold text-slate-900"
                          value={editProduct.current_stock ?? ''}
                          onChange={e => setEditProduct({...editProduct, current_stock: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">Min Safety Level *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
                          value={editProduct.min_stock_level ?? ''}
                          onChange={e => setEditProduct({...editProduct, min_stock_level: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">Location / Room</label>
                        <input
                          type="text"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 text-xs"
                          value={editProduct.location || ''}
                          onChange={e => setEditProduct({...editProduct, location: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1 text-xs">Unit of Measure (UOM)</label>
                        <input
                          type="text"
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 text-xs"
                          placeholder="Unit"
                          value={editProduct.uom || ''}
                          onChange={e => setEditProduct({...editProduct, uom: e.target.value})}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-xs">Asset Condition</label>
                      <select
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 bg-white text-xs"
                        value={editProduct.condition || 'Good condition'}
                        onChange={e => setEditProduct({...editProduct, condition: e.target.value})}
                      >
                        <option value="Good condition">Good condition</option>
                        <option value="Serviceable">Serviceable</option>
                        <option value="Under Maintenance">Under Maintenance</option>
                        <option value="Unserviceable">Unserviceable</option>
                        <option value="Damaged">Damaged</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Admin Password Verification Box */}
                <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200">
                  <label className="block font-bold text-rose-800 mb-1 text-xs flex items-center gap-1.5">
                    <Package size={14} className="text-rose-600" /> Admin Authorization Required
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter admin password to authorize changes"
                    disabled={lockoutSeconds > 0}
                    className="w-full rounded-xl border border-rose-200 bg-white px-3 py-2 outline-none focus:border-rose-400 text-slate-900 text-xs disabled:opacity-50"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { setEditProduct(null); setModalError(''); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || lockoutSeconds > 0}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 shadow-soft"
                >
                  {lockoutSeconds > 0 ? `Locked (${formatCountdown(lockoutSeconds)})` : submitting ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal — Responsive Rectangular Format */}
      {deleteProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-6" onClick={() => { setDeleteProductId(null); setModalError(''); }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-rose-900 text-white p-4 sm:p-5 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-white">Confirm Asset Deletion</h3>
              <button onClick={() => { setDeleteProductId(null); setModalError(''); }} className="text-rose-200 hover:text-white p-1 rounded-lg bg-rose-800/80 transition">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={confirmDelete} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto bg-slate-50 flex-1 text-sm">
                <p className="text-slate-600 text-xs leading-relaxed">
                  Are you sure you want to permanently delete this product and its associated stock records? This action cannot be reversed.
                </p>

                {modalError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium animate-in fade-in flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-600 shrink-0 animate-pulse" />
                      <span className="font-semibold">{modalError}</span>
                    </div>
                    {lockoutSeconds > 0 && (
                      <div className="mt-1 flex items-center justify-between bg-white/90 p-2 rounded-lg border border-rose-200">
                        <span className="text-slate-600 font-medium">⏱️ Unlock in:</span>
                        <span className="font-mono font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded text-xs tracking-wider">
                          {formatCountdown(lockoutSeconds)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1 text-xs">Admin Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Enter admin password to confirm"
                    disabled={lockoutSeconds > 0}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:border-rose-500 text-xs disabled:opacity-50"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => { setDeleteProductId(null); setModalError(''); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || lockoutSeconds > 0}
                  className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 shadow-soft"
                >
                  {lockoutSeconds > 0 ? `Locked (${formatCountdown(lockoutSeconds)})` : submitting ? 'Deleting…' : 'Confirm Delete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Floating Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] flex items-center gap-3 rounded-2xl bg-slate-900 text-white px-4 py-3 shadow-2xl border border-slate-700 animate-in slide-in-from-top-4 duration-300">
          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${toast.type === 'success' ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`} />
          <div className="text-xs font-medium">{toast.msg}</div>
          {lockoutSeconds > 0 && toast.type === 'error' && (
            <span className="font-mono font-bold text-rose-300 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/60 text-xs">
              {formatCountdown(lockoutSeconds)}
            </span>
          )}
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white text-xs">✕</button>
        </div>
      )}
    </div>
  )
}
