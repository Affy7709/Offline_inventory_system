import { useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { Search, Download, Filter, ShieldCheck } from 'lucide-react'
import { useInventory } from '../context/InventoryContext'

const toneMap = {
  Create: 'success',
  Issue: 'info',
  Return: 'warning',
  Adjust: 'danger',
}

export default function AuditPage() {
  const { auditLogs, currentUser, getSystemDate } = useInventory()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('All')

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      (log.user || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.action || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.record || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.id || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === 'All' || log.type === filterType

    return matchesSearch && matchesType
  })

  const handleExportAudit = () => {
    const headers = ['Log ID', 'Operator (Admin ID)', 'Action', 'Target Record', 'Timestamp', 'Event Type']
    const rows = filteredLogs.map((l) => [l.id, l.user, l.action, l.record, l.time, l.type])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${x}"`).join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Audit_Trail_Export_${getSystemDate()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Audit Logs & Compliance Trail</h2>
          <p className="text-xs text-slate-500">Immutable record of inventory transactions, stock modifications, and user access</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Admin: <strong>{currentUser.id}</strong></span>
          </div>
          <button
            onClick={handleExportAudit}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition shadow-sm"
          >
            <Download size={16} /> Export Audit Log
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 focus-within:border-slate-400 focus-within:bg-white transition w-full sm:w-80">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search by User, Action, Record ID..."
              className="w-full bg-transparent outline-none text-slate-800 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Filter:</span>
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="All">All Types</option>
              <option value="Create">Create</option>
              <option value="Issue">Issue</option>
              <option value="Return">Return</option>
              <option value="Adjust">Adjust</option>
            </select>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Log ID</th>
                <th className="px-4 py-3 font-semibold">Operator / User</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Target Record</th>
                <th className="px-4 py-3 font-semibold">Timestamp</th>
                <th className="px-4 py-3 font-semibold">Event Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{entry.id}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{entry.user}</td>
                  <td className="px-4 py-3 text-slate-700 text-xs font-medium">{entry.action}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{entry.record}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">{entry.time}</td>
                  <td className="px-4 py-3">
                    <Badge tone={toneMap[entry.type] || 'default'}>{entry.type}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Audit Cards */}
        <div className="grid gap-2.5 md:hidden">
          {filteredLogs.map((entry) => (
            <div key={entry.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900">{entry.id}</span>
                <Badge tone={toneMap[entry.type] || 'default'}>{entry.type}</Badge>
              </div>
              <div className="font-semibold text-slate-800">{entry.action}</div>
              <div className="text-slate-600 font-mono text-[11px]">{entry.record}</div>
              <div className="flex justify-between text-slate-400 font-mono text-[10px] pt-1 border-t border-slate-200">
                <span>By: <strong>{entry.user}</strong></span>
                <span>{entry.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


