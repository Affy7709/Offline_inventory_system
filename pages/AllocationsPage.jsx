import { useState, useEffect } from 'react'
import { Badge } from '../components/ui/Badge'
import { getApiBase, apiFetch } from '../api'

export default function AllocationsPage() {
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)

  const base = getApiBase()

  useEffect(() => {
    apiFetch(`${base}/index.php?action=allocations`)
      .then(r => r.json())
      .then(d => setAllocations(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [base])

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900">User & department allocation tracking</h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr>
                <th className="pb-3 pr-4 font-medium">User / Department</th>
                <th className="pb-3 pr-4 font-medium">Asset</th>
                <th className="pb-3 pr-4 font-medium text-center">Qty</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">Loading allocations…</td>
                </tr>
              ) : allocations.length > 0 ? (
                allocations.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 pr-4">
                      <div className="font-semibold text-slate-900">{entry.username || 'Employee'}</div>
                      <div className="text-xs text-slate-500">{entry.dept_name || 'General'}</div>
                    </td>
                    <td className="py-3 pr-4 font-medium text-slate-800">{entry.product_name}</td>
                    <td className="py-3 pr-4 text-slate-900 font-bold text-center">{entry.quantity}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={entry.type === 'issue' ? 'info' : 'success'}>
                        {entry.type === 'issue' ? 'Issued' : 'Returned'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 text-xs font-mono">
                      {String(entry.transaction_date || '').split('T')[0]}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">No allocation records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
