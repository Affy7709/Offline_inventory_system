import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { getApiBase, apiFetch, subscribeDataSync } from '../api'

export default function TransactionsPage() {
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)

  const base = getApiBase()

  const loadData = () => {
    apiFetch(`${base}/index.php?action=allocations`)
      .then(r => r.json())
      .then(allocs => {
        setAllocations(Array.isArray(allocs) ? allocs : [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
    const unsubscribe = subscribeDataSync(loadData, 3500)
    return () => unsubscribe()
  }, [base])

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">Audit & Log History</p>
          <h2 className="text-2xl font-semibold text-slate-900">Issues & Returns Journal</h2>
        </div>
        <Link 
          to="/qr"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition shadow-soft"
        >
          <span>Open Barcode Terminal for Issue / Return</span>
        </Link>
      </div>

      {/* Allocation history */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Allocation & Transaction History</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr>
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Item</th>
                <th className="pb-3 pr-4 font-medium">Issued To / User</th>
                <th className="pb-3 pr-4 font-medium">Qty</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading allocation history…</td>
                </tr>
              ) : allocations.length > 0 ? (
                allocations.map((row) => {
                  const personMatch = String(row.notes || '').match(/(?:Issued To|Returned By):\s*([^|]+)/i)
                  const targetPerson = personMatch ? personMatch[1].trim() : (row.username || row.dept_name || 'Staff')
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 pr-4 text-slate-500 font-mono text-xs">
                        {String(row.transaction_date || '').split('T')[0] || '—'}
                      </td>
                      <td className="py-3 pr-4 font-semibold text-slate-900">{row.product_name}</td>
                      <td className="py-3 pr-4">
                        <span className="font-semibold text-slate-800">{targetPerson}</span>
                        {row.username && row.username !== targetPerson && (
                          <span className="text-[11px] text-slate-400 block font-normal">by {row.username}</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 text-slate-900 font-bold">{row.quantity}</td>
                      <td className="py-3 pr-4">
                        <Badge tone={row.type === 'issue' ? 'info' : 'success'}>
                          {row.type === 'issue' ? 'Issued' : 'Returned'}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-slate-500 text-xs">{row.notes || '—'}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No allocation history recorded yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
