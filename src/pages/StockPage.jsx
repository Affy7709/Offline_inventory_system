import { useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { Search, Plus, X, CheckCircle2, ShieldCheck, Calendar, Clock } from 'lucide-react'
import { useInventory } from '../context/InventoryContext'

export default function StockPage() {
  const { products, adjustStock, currentUser, getSystemDate, getSystemTime } = useInventory()
  const [searchTerm, setSearchTerm] = useState('')
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState(products[0]?.product_name || products[0]?.name || '')
  const [adjustQty, setAdjustQty] = useState(5)
  const [adjustType, setAdjustType] = useState('ADD') // 'ADD' | 'SET'
  const [feedback, setFeedback] = useState('')

  // Calculate live statistics from context
  const totalStockCount = products.reduce(
    (acc, item) => acc + Number(item.available_stock ?? item.systemQty ?? item.qty ?? 0),
    0
  )
  const lowStockCount = products.filter(
    (item) => Number(item.available_stock ?? item.systemQty ?? item.qty ?? 0) <= Number(item.threshold || item.minStockLevel || 5)
  ).length
  const healthyCount = Math.max(0, products.length - lowStockCount)

  // Filtered rows
  const filteredRows = products.filter((item) => {
    const name = item.product_name || item.name || ''
    const loc = item.location || ''
    const sku = item.sku || item.secCatPartNo || item.sec_cat_part_no || ''
    const bc = item.barcode || ''
    return (
      name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      loc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bc.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const handleAdjustSubmit = (e) => {
    e.preventDefault()
    const target = products.find((p) => (p.product_name || p.name) === adjustTarget)
    if (target) {
      adjustStock({
        productId: target.product_id || target.id,
        quantity: Number(adjustQty),
        mode: adjustType,
      })
      setIsAdjustModalOpen(false)
      setFeedback(
        `✓ Stock adjusted for "${adjustTarget}" by Admin [${currentUser.id}] at ${getSystemTime()}!`
      )
      setTimeout(() => setFeedback(''), 4000)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Stock Management & Audit</h2>
          <p className="text-xs text-slate-500">Monitor minimum safety thresholds, balance levels, and adjustments</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Admin: <strong>{currentUser.id}</strong></span>
          </div>
          <button
            onClick={() => {
              setAdjustTarget(products[0]?.product_name || products[0]?.name || '')
              setIsAdjustModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition shadow-sm"
          >
            <Plus size={16} /> Bulk Adjustment
          </button>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 size={18} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Stock Overview Metric Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm text-slate-500 font-medium">Total Available Stock Units</p>
          <div className="mt-2 text-3xl font-extrabold text-slate-900">{totalStockCount}</div>
          <p className="mt-1 text-xs text-emerald-600 font-medium">Across {products.length} registered asset types</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm text-slate-500 font-medium">Healthy Coverage Items</p>
          <div className="mt-2 text-3xl font-extrabold text-emerald-600">{healthyCount}</div>
          <p className="mt-1 text-xs text-slate-500">Above minimum safety threshold</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm text-slate-500 font-medium">Low Stock Alerts</p>
          <div className="mt-2 text-3xl font-extrabold text-rose-600">{lowStockCount}</div>
          <p className="mt-1 text-xs text-rose-500 font-medium">Requires restock</p>
        </div>
      </div>

      {/* Stock Thresholds Matrix Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-bold text-slate-900">Stock Safety Thresholds Matrix</h3>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 focus-within:border-slate-400 focus-within:bg-white transition w-full sm:w-72">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search items, barcode, location..."
              className="w-full bg-transparent outline-none text-slate-800 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Item / Asset</th>
                <th className="px-4 py-3 font-semibold">Barcode / SKU</th>
                <th className="px-4 py-3 font-semibold">Available Stock</th>
                <th className="px-4 py-3 font-semibold">Safety Threshold</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Quick Restock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const itemName = row.product_name || row.name
                const qty = Number(row.available_stock ?? row.systemQty ?? row.qty ?? 0)
                const threshold = Number(row.min_stock_level ?? row.threshold ?? 5)
                const status = qty <= threshold ? 'Low Stock' : 'In Stock'

                return (
                  <tr key={row.id || row.product_id || itemName} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-900">{itemName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{row.barcode || row.sku}</td>
                    <td className="px-4 py-3 font-bold font-mono text-slate-900">{qty} units</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{threshold} units</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{row.location || 'Warehouse Main'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={status === 'In Stock' ? 'success' : 'danger'}>{status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setAdjustTarget(itemName)
                          setAdjustType('ADD')
                          setAdjustQty(5)
                          setIsAdjustModalOpen(true)
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-sm"
                      >
                        + Restock
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Stock Cards */}
        <div className="grid gap-3 md:hidden">
          {filteredRows.map((row) => {
            const itemName = row.product_name || row.name
            const qty = Number(row.available_stock ?? row.systemQty ?? row.qty ?? 0)
            const threshold = Number(row.min_stock_level ?? row.threshold ?? 5)
            const status = qty <= threshold ? 'Low Stock' : 'In Stock'

            return (
              <div
                key={row.id || row.product_id || itemName}
                className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">{itemName}</span>
                  <Badge tone={status === 'In Stock' ? 'success' : 'danger'}>{status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-600">
                  <div>Stock: <strong className="text-slate-900 text-sm font-mono">{qty} units</strong></div>
                  <div>Safety Min: <span className="font-mono text-slate-700 font-bold">{threshold} units</span></div>
                  <div>Barcode: <span className="font-mono text-slate-500">{row.barcode || row.sku}</span></div>
                  <div>Loc: <span className="text-slate-700">{row.location || 'Main'}</span></div>
                </div>
                <div className="pt-1 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => {
                      setAdjustTarget(itemName)
                      setAdjustType('ADD')
                      setAdjustQty(5)
                      setIsAdjustModalOpen(true)
                    }}
                    className="w-full py-2 rounded-lg bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition text-center"
                  >
                    + Restock (+5)
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ADJUSTMENT MODAL */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleAdjustSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Stock Balance Adjustment</h3>
                <p className="text-xs text-slate-500">Operator ID: <strong>{currentUser.id}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-sm space-y-3">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Target Asset</label>
                <select
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
                  value={adjustTarget}
                  onChange={(e) => setAdjustTarget(e.target.value)}
                >
                  {products.map((item) => (
                    <option key={item.id || item.product_id} value={item.product_name || item.name}>
                      {item.product_name || item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Adjustment Mode</label>
                <select
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value)}
                >
                  <option value="ADD">Add to existing stock (+)</option>
                  <option value="SET">Set exact stock level (=)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Quantity Amount</label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800 font-bold"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Save Adjustment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

