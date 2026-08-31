import { useState, useEffect } from 'react'
import { Badge } from '../components/ui/Badge'
import { getApiBase, apiFetch, subscribeDataSync } from '../api'

export default function StockPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const base = getApiBase()

  const loadData = () => {
    apiFetch(`${base}/index.php?action=stock_summary`)
      .then(r => r.json())
      .then(d => setData(d || {}))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    const unsubscribe = subscribeDataSync(loadData, 3500)
    return () => unsubscribe()
  }, [base])

  const stockRows = data?.products || []
  const stockIn = data?.stockIn ?? 0
  const stockOut = data?.stockOut ?? 0
  const auditCorrections = data?.auditCorrections ?? 0

  const getStatus = (row) => {
    const stock = Number(row.current_stock)
    const min = Number(row.min_stock_level)
    if (stock <= 0) return 'Out of Stock'
    if (stock <= min) return 'Low Stock'
    return 'In Stock'
  }

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900">Stock management</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
          <p className="text-sm text-slate-500">Stock in</p>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{stockIn}</div>
          <p className="mt-2 text-sm text-slate-500">This month</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
          <p className="text-sm text-slate-500">Stock out</p>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{stockOut}</div>
          <p className="mt-2 text-sm text-slate-500">This month</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
          <p className="text-sm text-slate-500">Audit corrections</p>
          <div className="mt-3 text-3xl font-semibold text-slate-900">{auditCorrections}</div>
          <p className="mt-2 text-sm text-slate-500">Last 30 days</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Stock thresholds</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr>
                <th className="pb-3 pr-4 font-medium">Item</th>
                <th className="pb-3 pr-4 font-medium">SKU</th>
                <th className="pb-3 pr-4 font-medium text-center">Qty</th>
                <th className="pb-3 pr-4 font-medium text-center">Threshold</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Loading stock data…</td>
                </tr>
              ) : stockRows.length > 0 ? (
                stockRows.map((row) => {
                  const status = getStatus(row)
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 pr-4 font-semibold text-slate-800">{row.name}</td>
                      <td className="py-3 pr-4 text-slate-500 font-mono text-xs">{row.sku}</td>
                      <td className="py-3 pr-4 text-slate-900 font-bold text-center">{row.current_stock}</td>
                      <td className="py-3 pr-4 text-slate-600 text-center">{row.min_stock_level}</td>
                      <td className="py-3">
                        <Badge tone={status === 'In Stock' ? 'success' : 'danger'}>{status}</Badge>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No stock records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
