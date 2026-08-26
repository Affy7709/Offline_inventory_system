import { useState, useEffect } from 'react'
import { Badge } from '../components/ui/Badge'
import { getApiBase, apiFetch } from '../api'

const toneMap = {
  Create: 'success',
  Issue: 'info',
  Return: 'warning',
  Adjust: 'danger',
}

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const base = getApiBase()

  useEffect(() => {
    apiFetch(`${base}/index.php?action=audit_logs`)
      .then(r => r.json())
      .then(d => setAuditLogs(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [base])

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900">Audit logs</h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr>
                <th className="pb-3 pr-4 font-medium">Log ID</th>
                <th className="pb-3 pr-4 font-medium">User</th>
                <th className="pb-3 pr-4 font-medium">Action</th>
                <th className="pb-3 pr-4 font-medium">Record / Entity</th>
                <th className="pb-3 pr-4 font-medium">Time</th>
                <th className="pb-3 pr-4 font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">Loading audit logs…</td>
                </tr>
              ) : auditLogs.length > 0 ? (
                auditLogs.map((entry) => {
                  const isFail = entry.action?.toLowerCase().includes('fail') || entry.action?.toLowerCase().includes('block')
                  const isLogin = entry.action?.toLowerCase().includes('login')
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 pr-4 text-slate-500 font-mono text-xs">#{entry.id}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-900">{entry.username || 'System'}</td>
                      <td className="py-3 pr-4 text-slate-700">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${isFail ? 'bg-rose-500' : isLogin ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                          {entry.action}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{entry.entity || entry.new_value || '—'}</td>
                      <td className="py-3 pr-4 text-slate-500 font-mono text-xs">
                        {String(entry.timestamp || '').replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="py-3 pr-4 text-slate-500 font-mono text-xs">{entry.ip_address || '127.0.0.1'}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No audit log records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
