import { Badge } from '../components/ui/Badge'

const stockRows = [
  { item: 'Dell Latitude 5420', qty: 22, threshold: 12, status: 'In Stock', location: 'Warehouse B-2' },
  { item: 'Cisco IP Phone 8851', qty: 9, threshold: 10, status: 'Low Stock', location: 'IT Room' },
  { item: 'HP LaserJet MFP', qty: 5, threshold: 8, status: 'Under Maintenance', location: 'Service Bay' },
  { item: 'Zebra Scanner GX420t', qty: 26, threshold: 8, status: 'In Stock', location: 'Warehouse A-4' },
]

export default function StockPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900">Stock management</h2>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
          <p className="text-sm text-slate-500">Stock in</p>
          <div className="mt-3 text-3xl font-semibold text-slate-900">184</div>
          <p className="mt-2 text-sm text-slate-500">This month</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
          <p className="text-sm text-slate-500">Stock out</p>
          <div className="mt-3 text-3xl font-semibold text-slate-900">121</div>
          <p className="mt-2 text-sm text-slate-500">This month</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
          <p className="text-sm text-slate-500">Audit corrections</p>
          <div className="mt-3 text-3xl font-semibold text-slate-900">09</div>
          <p className="mt-2 text-sm text-slate-500">Last 30 days</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-slate-900">Stock thresholds</h3>
          <button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">Bulk adjustment</button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500">
              <tr>
                <th className="pb-3 pr-4 font-medium">Item</th>
                <th className="pb-3 pr-4 font-medium">Qty</th>
                <th className="pb-3 pr-4 font-medium">Threshold</th>
                <th className="pb-3 pr-4 font-medium">Location</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {stockRows.map((row) => (
                <tr key={row.item} className="border-t border-slate-200">
                  <td className="py-3 pr-4 text-slate-700">{row.item}</td>
                  <td className="py-3 pr-4 text-slate-700">{row.qty}</td>
                  <td className="py-3 pr-4 text-slate-600">{row.threshold}</td>
                  <td className="py-3 pr-4 text-slate-600">{row.location}</td>
                  <td className="py-3"><Badge tone={row.status === 'In Stock' ? 'success' : row.status === 'Low Stock' ? 'danger' : 'warning'}>{row.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
