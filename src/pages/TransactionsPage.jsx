import { Badge } from '../components/ui/Badge'

const issueRows = [
  { id: 'ISS-410', item: 'Dell Latitude 5420', to: 'Operations', qty: 3, status: 'Issued', due: '2026-08-29' },
  { id: 'ISS-412', item: 'Zebra Scanner GX420t', to: 'Field Service', qty: 2, status: 'Returned', due: '2026-08-18' },
  { id: 'ISS-415', item: 'Epson Projector', to: 'Training Room', qty: 1, status: 'Overdue', due: '2026-08-10' },
]

export default function TransactionsPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900">Issue & return management</h2>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
          <h3 className="text-xl font-semibold text-slate-900">Issue asset</h3>
          <div className="mt-4 space-y-4 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-slate-600">Product</label>
                <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none" value="Dell Latitude 5420" readOnly />
              </div>
              <div>
                <label className="mb-1.5 block text-slate-600">Quantity</label>
                <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none" value="3" readOnly />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-slate-600">Issued to</label>
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none" value="Operations Team" readOnly />
            </div>
            <div>
              <label className="mb-1.5 block text-slate-600">Purpose</label>
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none" value="Field ops support" readOnly />
            </div>
            <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">Issue asset</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
          <h3 className="text-xl font-semibold text-slate-900">Return asset</h3>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <label className="mb-1.5 block text-slate-600">Returned item</label>
              <input className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none" value="Zebra Scanner GX420t" readOnly />
            </div>
            <div>
              <label className="mb-1.5 block text-slate-600">Condition</label>
              <select className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none">
                <option>Good condition</option>
                <option>Minor wear</option>
                <option>Requires repair</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-slate-600">Notes</label>
              <textarea className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none" value="Battery replaced, scanner calibrated." readOnly />
            </div>
            <button className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white">Log return</button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <h3 className="text-xl font-semibold text-slate-900">Allocation history</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-4 font-medium">ID</th>
                <th className="pb-3 pr-4 font-medium">Item</th>
                <th className="pb-3 pr-4 font-medium">Issued To</th>
                <th className="pb-3 pr-4 font-medium">Qty</th>
                <th className="pb-3 pr-4 font-medium">Due Date</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {issueRows.map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="py-3 pr-4 text-slate-600">{row.id}</td>
                  <td className="py-3 pr-4 text-slate-700">{row.item}</td>
                  <td className="py-3 pr-4 text-slate-700">{row.to}</td>
                  <td className="py-3 pr-4 text-slate-700">{row.qty}</td>
                  <td className="py-3 pr-4 text-slate-600">{row.due}</td>
                  <td className="py-3">
                    <Badge tone={row.status === 'Issued' ? 'info' : row.status === 'Returned' ? 'success' : 'danger'}>{row.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
