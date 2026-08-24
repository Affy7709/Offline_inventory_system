import { auditLogs } from '../data/mockData'
import { Badge } from '../components/ui/Badge'

const toneMap = {
  Create: 'success',
  Issue: 'info',
  Return: 'warning',
  Adjust: 'danger',
}

export default function AuditPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900">Audit logs</h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-4 font-medium">Log ID</th>
                <th className="pb-3 pr-4 font-medium">User</th>
                <th className="pb-3 pr-4 font-medium">Action</th>
                <th className="pb-3 pr-4 font-medium">Record</th>
                <th className="pb-3 pr-4 font-medium">Time</th>
                <th className="pb-3 font-medium">Type</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-200">
                  <td className="py-3 pr-4 text-slate-600">{entry.id}</td>
                  <td className="py-3 pr-4 text-slate-700">{entry.user}</td>
                  <td className="py-3 pr-4 text-slate-700">{entry.action}</td>
                  <td className="py-3 pr-4 text-slate-600">{entry.record}</td>
                  <td className="py-3 pr-4 text-slate-600">{entry.time}</td>
                  <td className="py-3"><Badge tone={toneMap[entry.type] || 'default'}>{entry.type}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
