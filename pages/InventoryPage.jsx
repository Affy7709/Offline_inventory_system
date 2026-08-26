import { useState, useEffect } from 'react'
import { Search, Plus, Filter, Download, X, Package } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { getApiBase, apiFetch } from '../api'

const statusTone = {
  'In Stock': 'success',
  'Issued': 'info',
  'Under Maintenance': 'warning',
  'Low Stock': 'danger',
  'Out of Stock': 'danger',
}

export default function InventoryPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [showAddModal, setShowAddModal] = useState(false)
  const [categories, setCategories] = useState([])

  // Form state
  const [newName, setNewName] = useState('')
  const [newSku, setNewSku] = useState('')
  const [newBarcode, setNewBarcode] = useState('')
  const [newStock, setNewStock] = useState(10)
  const [newMinStock, setNewMinStock] = useState(5)
  const [submitting, setSubmitting] = useState(false)

  const base = getApiBase()

  const loadProducts = () => {
    setLoading(true)
    apiFetch(`${base}/index.php?action=products`)
      .then(r => r.json())
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadProducts()
    apiFetch(`${base}/index.php?action=categories`)
      .then(r => r.json())
      .then(d => setCategories(Array.isArray(d) ? d : []))
      .catch(console.error)
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
          current_stock: Number(newStock),
          min_stock_level: Number(newMinStock),
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setShowAddModal(false)
        setNewName('')
        setNewSku('')
        setNewBarcode('')
        setNewStock(10)
        setNewMinStock(5)
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

  const filtered = products.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !search || p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q)
    const matchCat = categoryFilter === 'All categories' || p.subcategory_name === categoryFilter
    const status = getProductStatus(p)
    const matchStatus = statusFilter === 'All statuses' || status === statusFilter
    return matchSearch && matchCat && matchStatus
  })

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Inventory</p>
            <h2 className="text-2xl font-semibold text-slate-900">Product catalog</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
            >
              <Plus size={16} />
              Add product
            </button>
          </div>
        </div>

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

      {/* Catalog Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Barcode</th>
                <th className="px-4 py-3 font-medium text-center">Qty</th>
                <th className="px-4 py-3 font-medium text-center">Threshold</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">Loading catalog…</td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map((product) => {
                  const status = getProductStatus(product)
                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                            <Package size={20} />
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{product.name}</div>
                            <div className="text-xs text-slate-500">{product.subcategory_name || 'General'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{product.sku}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{product.barcode || '—'}</td>
                      <td className="px-4 py-3 text-slate-900 font-bold text-center">{product.current_stock}</td>
                      <td className="px-4 py-3 text-slate-500 text-center">{product.min_stock_level}</td>
                      <td className="px-4 py-3">
                        <Badge tone={statusTone[status] || 'default'}>{status}</Badge>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">No products found. Click "Add Product" to create one.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
