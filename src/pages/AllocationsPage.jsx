import { allocations } from '../data/mockData'
import { Badge } from '../components/ui/Badge'

export default function AllocationsPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900">User & department allocation tracking</h2>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-4 font-medium">User / Department</th>
                <th className="pb-3 pr-4 font-medium">Asset</th>
                <th className="pb-3 pr-4 font-medium">Qty</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((entry) => (
                <tr key={`${entry.user}-${entry.asset}`} className="border-t border-slate-200">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-800">{entry.user}</div>
                    <div className="text-xs text-slate-500">{entry.department}</div>
                  </td>
                  <td className="py-3 pr-4 text-slate-700">{entry.asset}</td>
                  <td className="py-3 pr-4 text-slate-700">{entry.qty}</td>
                  <td className="py-3"><Badge tone={entry.status === 'Issued' ? 'info' : entry.status === 'Returned' ? 'success' : 'warning'}>{entry.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
