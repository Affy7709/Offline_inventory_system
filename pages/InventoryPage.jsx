import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Plus, Filter, Download, Upload, X, Package, FileDown, FileUp } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { getApiBase, apiFetch } from '../api'
import Barcode from 'react-barcode'
import { Barcode as BarcodeIcon } from 'lucide-react'

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

  useEffect(() => {
    loadProducts()
    apiFetch(`${base}/index.php?action=categories`)
      .then(r => r.json())
      .then(d => setCategories(Array.isArray(d) ? d : []))
      .catch(console.error)
    apiFetch(`${base}/index.php?action=subcategories`)
      .then(r => r.json())
      .then(d => setSubcategories(Array.isArray(d) ? d : []))
      .catch(console.error)

    // Live multi-device auto-sync polling
    const interval = setInterval(loadProducts, 4000)
    const onFocus = () => loadProducts()
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
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
        loadProducts()
      } else {
        alert(data.error || 'Failed to add product')
      }
    } catch {
      alert('Error connecting to backend server')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product and its stock data?")) return
    try {
      const res = await apiFetch(`${base}/index.php?action=products&id=${id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSelectedProduct(null)
        loadProducts()
      } else {
        alert(data.error || 'Failed to delete product')
      }
    } catch {
      alert('Error connecting to backend server')
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
      p.subcategory_name || '',  // Category (using subcategory_name as best approximation)
      '',                    // Sub-Category
      '',                    // UOM
      p.current_stock,       // Auth Qty
      p.current_stock,       // System Qty
      p.current_stock,       // Physical Qty
      p.current_stock,       // Serviceable
      0,                     // Unserviceable
      'Serviceable',         // Condition
      getProductStatus(p),   // Status
      '',                    // Repairable
      '',                    // Issued To
      '',                    // Issued By
      '',                    // Location
      p.min_stock_level,     // Min Stock Level
      (p.updated_at || new Date().toISOString()).split('T')[0],  // Date
      '',                    // Date of Exit
      '',                    // Time Entry
      '',                    // Remarks
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
      } else {
        alert(data.error || 'Failed to update stock')
      }
    } catch {
      alert('Error updating stock on server')
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
                <th className="px-4 py-3 font-medium text-center">Scanner Action</th>
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
                          Scan Barcode
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

      {/* View Product Modal Card */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setSelectedProduct(null)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="relative bg-slate-900 text-white p-5 flex flex-col items-center">
              <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-xl bg-slate-800/80 transition">
                <X size={18} />
              </button>

              <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200 w-full flex justify-center overflow-hidden my-1">
                <Barcode value={selectedProduct.barcode || selectedProduct.sku || 'N/A'} width={1.8} height={48} displayValue={true} margin={0} />
              </div>

              <h2 className="text-xl font-bold text-white text-center leading-tight mt-3">{selectedProduct.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="rounded bg-slate-800 px-2.5 py-1 text-xs font-mono font-semibold text-emerald-400 border border-slate-700">{selectedProduct.sku}</span>
                {selectedProduct.uom && <span className="rounded bg-slate-800 px-2 py-1 text-xs font-semibold text-slate-300 border border-slate-700">UOM: {selectedProduct.uom}</span>}
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 space-y-4 overflow-y-auto bg-slate-50 flex-1">
              {/* 4 Quantities Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Physical / Current</div>
                  <div className={`text-xl font-extrabold mt-1 ${Number(selectedProduct.current_stock) <= Number(selectedProduct.min_stock_level) ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {selectedProduct.current_stock}
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Authorized</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-1">{selectedProduct.auth_qty || selectedProduct.current_stock}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">System Qty</div>
                  <div className="text-xl font-extrabold text-slate-800 mt-1">{selectedProduct.system_qty || selectedProduct.current_stock}</div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-center shadow-xs">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Serviceable</div>
                  <div className="text-xl font-extrabold text-blue-600 mt-1">{selectedProduct.serviceable_qty || selectedProduct.current_stock}</div>
                </div>
              </div>

              {/* Extended Details Grid */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5 text-xs text-slate-700">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Category</span>
                  <span className="font-semibold text-slate-900">{selectedProduct.category_name || 'General'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Sub-Category</span>
                  <span className="font-semibold text-slate-900">{selectedProduct.subcategory_name || '—'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Location / Store Room</span>
                  <span className="font-semibold text-slate-900">{selectedProduct.location || 'Warehouse Main'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Condition</span>
                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">{selectedProduct.condition || 'Good condition'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Status</span>
                  <Badge tone={statusTone[getProductStatus(selectedProduct)] || 'default'}>{getProductStatus(selectedProduct)}</Badge>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Issued To</span>
                  <span className="font-semibold text-slate-900">{selectedProduct.issued_to || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Issued By</span>
                  <span className="font-semibold text-slate-900">{selectedProduct.issued_by || 'ADM-101'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 font-medium">Min Threshold</span>
                  <span className="font-semibold text-slate-900">{selectedProduct.min_stock_level} units</span>
                </div>
                {selectedProduct.remarks && (
                  <div className="pt-1">
                    <span className="text-slate-500 font-medium block mb-1">Remarks</span>
                    <p className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-600 font-mono text-[11px]">{selectedProduct.remarks}</p>
                  </div>
                )}
              </div>

              {currentUser?.role_name === 'Admin' && (
                <div className="pt-2">
                  <button
                    onClick={() => handleDeleteProduct(selectedProduct.id)}
                    className="w-full rounded-xl bg-rose-50 border border-rose-200 px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-100 transition"
                  >
                    Delete Product & Stock Record
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add New Product</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
                  placeholder="e.g. Dell Latitude 5420"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">SKU</label>
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
                  <label className="block font-semibold text-slate-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 font-mono text-xs"
                    placeholder="BC-123456"
                    value={newBarcode}
                    onChange={e => setNewBarcode(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category & Subcategory</label>
                <select
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900 bg-white"
                  value={newSubcategory}
                  onChange={e => setNewSubcategory(e.target.value)}
                >
                  <option value="">General / Uncategorized</option>
                  {subcategories.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.category_name})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    required
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-slate-900"
                    value={newStock}
                    onChange={e => setNewStock(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Threshold</label>
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

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : 'Create Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
