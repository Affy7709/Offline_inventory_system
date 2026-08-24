import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import { AlertTriangle, ArrowRightLeft, Barcode, Boxes, Plus, QrCode, Warehouse } from 'lucide-react'
import KpiCard from '../components/dashboard/KpiCard'
import StatusDonut from '../components/dashboard/StatusDonut'
import { kpis, stockTrend, statusDistribution, lowStockAlerts, recentTransactions } from '../data/mockData'
import { Badge } from '../components/ui/Badge'

const quickActions = [
  { label: 'Scan QR', icon: QrCode },
  { label: 'Add Product', icon: Plus },
  { label: 'Stock In', icon: Boxes },
  { label: 'Stock Out', icon: Warehouse },
  { label: 'Issue', icon: ArrowRightLeft },
  { label: 'Return', icon: Barcode },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.8fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Stock overview</p>
              <h2 className="text-xl font-semibold text-slate-900">Monthly asset trend</h2>
            </div>
            <Badge tone="success">+18.2% YoY</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stockTrend}>
                <defs>
                  <linearGradient id="stockFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={3} fill="url(#stockFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Status</p>
              <h2 className="text-xl font-semibold text-slate-900">Current mix</h2>
            </div>
          </div>
          <StatusDonut data={statusDistribution} />
          <div className="space-y-2">
            {statusDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600">{item.name}</span>
                </div>
                <span className="font-semibold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Transactions</p>
              <h2 className="text-xl font-semibold text-slate-900">Recent activity</h2>
            </div>
            <button className="text-sm font-medium text-slate-700">View all</button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 font-medium">ID</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Asset</th>
                  <th className="pb-3 font-medium">Qty</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-none">
                    <td className="py-3 pr-4 text-slate-600">{item.id}</td>
                    <td className="py-3 pr-4 text-slate-700">{item.type}</td>
                    <td className="py-3 pr-4 text-slate-700">{item.asset}</td>
                    <td className="py-3 pr-4 text-slate-700">{item.qty}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={item.status === 'Completed' ? 'success' : item.status === 'Overdue' ? 'danger' : item.status === 'Issued' ? 'info' : 'warning'}>{item.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-l-4 border-amber-400 bg-amber-50 p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2 text-amber-700">
            <AlertTriangle size={18} />
            <h2 className="text-xl font-semibold">Low stock alerts</h2>
          </div>
          <div className="space-y-3">
            {lowStockAlerts.map((alert) => (
              <div key={alert.id} className="rounded-xl border border-amber-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{alert.name}</span>
                  <Badge tone="danger">{alert.remaining} left</Badge>
                </div>
                <p className="mt-2 text-xs text-slate-500">Threshold: {alert.threshold} • {alert.location}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Quick actions</h2>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
          {quickActions.map(({ label, icon: Icon }) => (
            <button key={label} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100">
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
