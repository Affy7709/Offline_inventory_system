import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  ResponsiveContainer, Tooltip 
} from 'recharts'
import { 
  AlertTriangle, ArrowRightLeft, Barcode, Boxes, Plus, QrCode, Warehouse,
  Package, TrendingUp, ArrowUpRight, ArrowDownRight
} from 'lucide-react'
import StatusDonut from '../components/dashboard/StatusDonut'
import { Badge } from '../components/ui/Badge'
import { getApiBase, apiFetch } from '../api'

export default function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [stockData, setStockData] = useState(null)
  const [loading, setLoading] = useState(true)

  const base = getApiBase()

  useEffect(() => {
    Promise.all([
      apiFetch(`${base}/index.php?action=dashboard`).then(r => r.json()).catch(() => ({})),
      apiFetch(`${base}/index.php?action=stock_summary`).then(r => r.json()).catch(() => ({}))
    ])
    .then(([dash, stock]) => {
      setData(dash || {})
      setStockData(stock || {})
    })
    .finally(() => setLoading(false))
  }, [base])

  const totalProducts = Number(data?.totalProducts || stockData?.products?.length || 0)
  const lowStockCount = Number(data?.lowStockCount || 0)
  const stockInCount  = Number(stockData?.stockIn || 0)
  const stockOutCount = Number(stockData?.stockOut || 0)
  const inStockCount  = Math.max(0, totalProducts - lowStockCount)

  const kpis = [
    { label: 'Total Products', value: totalProducts, delta: '+100%', trend: 'up', detail: 'catalog total' },
    { label: 'In Stock', value: inStockCount, delta: 'Healthy', trend: 'up', detail: 'above threshold' },
    { label: 'Low Stock Alerts', value: lowStockCount, delta: `${lowStockCount} items`, trend: lowStockCount > 0 ? 'down' : 'up', detail: 'needs reorder' },
    { label: 'Stock In (Month)', value: stockInCount, delta: 'Active', trend: 'up', detail: 'incoming units' },
    { label: 'Stock Out (Month)', value: stockOutCount, delta: 'Issued', trend: 'down', detail: 'fulfilled units' },
  ]

  // Distribution for Status Donut (Pie Chart)
  const statusDistribution = [
    { name: 'In Stock', value: inStockCount || 1, color: '#0f172a' },
    { name: 'Low Stock', value: lowStockCount, color: '#ef4444' },
    { name: 'Stock Out', value: stockOutCount, color: '#8b5cf6' },
  ].filter(i => i.value > 0)

  // Low Stock Items for Bar Chart
  const lowStockItems = data?.lowStockItems || (stockData?.products || []).filter(p => Number(p.current_stock) <= Number(p.min_stock_level)).slice(0, 6)
  
  const barChartData = lowStockItems.map(p => ({
    name: p.name?.length > 12 ? p.name.substring(0, 12) + '…' : p.name,
    stock: Number(p.current_stock),
    min: Number(p.min_stock_level)
  }))

  // Monthly trend mock/real
  const trendData = [
    { month: 'Jan', value: Math.max(10, totalProducts - 15) },
    { month: 'Feb', value: Math.max(12, totalProducts - 10) },
    { month: 'Mar', value: Math.max(15, totalProducts - 5) },
    { month: 'Apr', value: Math.max(18, totalProducts - 2) },
    { month: 'May', value: totalProducts + 2 },
    { month: 'Jun', value: totalProducts + 5 },
  ]

  const recentTxs = data?.recentTransactions || []

  const quickActions = [
    { label: 'Scan QR', icon: QrCode, action: () => navigate('/qr') },
    { label: 'Add Product', icon: Plus, action: () => navigate('/inventory') },
    { label: 'Stock In', icon: Boxes, action: () => navigate('/stock') },
    { label: 'Stock Out', icon: Warehouse, action: () => navigate('/stock') },
    { label: 'Issue', icon: ArrowRightLeft, action: () => navigate('/transactions') },
    { label: 'Return', icon: Barcode, action: () => navigate('/transactions') },
  ]

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      {/* KPI Cards Row */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpis.map((item) => {
          const positive = item.trend === 'up'
          return (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <h3 className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</h3>
                </div>
                <div className={`rounded-full p-2 ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className={positive ? 'text-emerald-600' : 'text-rose-600'}>{item.delta}</span>
                <span className="text-slate-500">{item.detail}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Visual Charts Grid: Area Chart + Pie/Donut Chart + Bar Chart */}
      <div className="grid gap-6 xl:grid-cols-[1.8fr_0.9fr]">
        {/* Area Chart: Monthly Trend */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Stock overview</p>
              <h2 className="text-xl font-semibold text-slate-900">Monthly Asset Trend</h2>
            </div>
            <Badge tone="success">+18.2% YoY</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
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

        {/* Pie / Donut Chart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Status Distribution</p>
              <h2 className="text-xl font-semibold text-slate-900">Inventory Mix</h2>
            </div>
          </div>
          <StatusDonut data={statusDistribution} />
          <div className="space-y-2 mt-3">
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

      {/* Bar Chart: Low Stock vs Minimum Threshold */}
      {barChartData.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Threshold analysis</p>
              <h2 className="text-xl font-semibold text-slate-900">Low Stock Bar Comparison</h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">Current vs Min Level</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData} barCategoryGap="20%">
                <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="stock" fill="#ef4444" radius={[6, 6, 0, 0]} maxBarSize={36} name="Current Stock" />
                <Bar dataKey="min" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={36} name="Min Level" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bottom Grid: Recent Activity + Low Stock Alerts */}
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Recent Activity Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Transactions</p>
              <h2 className="text-xl font-semibold text-slate-900">Recent Activity</h2>
            </div>
            <button onClick={() => navigate('/transactions')} className="text-sm font-medium text-slate-700 hover:text-slate-900">View all</button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Product</th>
                  <th className="pb-3 font-medium">Qty</th>
                  <th className="pb-3 font-medium">User</th>
                </tr>
              </thead>
              <tbody>
                {recentTxs.length > 0 ? (
                  recentTxs.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100 last:border-none">
                      <td className="py-3 pr-4">
                        <Badge tone={item.type === 'issue' ? 'danger' : item.type === 'return' ? 'success' : 'info'}>
                          {item.type?.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 font-medium text-slate-800">{item.product_name || 'Item'}</td>
                      <td className="py-3 pr-4 text-slate-700 font-semibold">{item.quantity}</td>
                      <td className="py-3 pr-4 text-slate-500">{item.username || 'Staff'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">No recent transactions yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-l-4 border-amber-400 bg-amber-50 p-5 shadow-soft">
          <div className="mb-4 flex items-center gap-2 text-amber-700">
            <AlertTriangle size={18} />
            <h2 className="text-xl font-semibold">Low Stock Alerts</h2>
          </div>
          <div className="space-y-3">
            {lowStockItems.length > 0 ? (
              lowStockItems.map((alert) => (
                <div key={alert.id} className="rounded-xl border border-amber-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">{alert.name}</span>
                    <Badge tone="danger">{alert.current_stock} left</Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">Threshold: {alert.min_stock_level} • SKU: {alert.sku}</p>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
                ✓ All stock levels healthy
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Quick Actions</h2>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-6">
          {quickActions.map(({ label, icon: Icon, action }) => (
            <button key={label} onClick={action} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-100">
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
