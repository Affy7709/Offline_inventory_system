import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'
import {
  AlertTriangle,
  ArrowRightLeft,
  Barcode,
  Boxes,
  Plus,
  QrCode,
  Warehouse,
  RefreshCw,
  ShieldCheck,
  Calendar,
  Clock,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import KpiCard from '../components/dashboard/KpiCard'
import StatusDonut from '../components/dashboard/StatusDonut'
import { stockTrend } from '../data/mockData'
import { Badge } from '../components/ui/Badge'
import { useInventory } from '../context/InventoryContext'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { products, transactions, currentUser, getSystemDate, getSystemTime, refreshBackendData } = useInventory()

  const [systemTime, setSystemTime] = useState(getSystemTime())
  const [systemDate, setSystemDate] = useState(getSystemDate())

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(getSystemTime())
      setSystemDate(getSystemDate())
    }, 1000)
    return () => clearInterval(timer)
  }, [getSystemTime, getSystemDate])

  // Live KPI Calculations
  const totalCount = products.length
  const totalAvailableStock = products.reduce(
    (acc, p) => acc + Number(p.available_stock ?? p.systemQty ?? p.qty ?? 0),
    0
  )
  const inStockCount = products.filter(
    (p) => Number(p.available_stock ?? p.systemQty ?? p.qty ?? 0) > Number(p.threshold || p.minStockLevel || 5)
  ).length
  const lowStockProducts = products.filter(
    (p) => Number(p.available_stock ?? p.systemQty ?? p.qty ?? 0) <= Number(p.threshold || p.minStockLevel || 5)
  )
  const lowStockCount = lowStockProducts.length
  const issuedTxCount = transactions.filter((t) => (t.transaction_type || t.type || '').toUpperCase().includes('ISSUE')).length

  const kpis = [
    {
      label: 'Total Products',
      value: String(totalCount),
      delta: '+12.4%',
      trend: 'up',
      detail: `${totalAvailableStock} active units`,
    },
    {
      label: 'In Stock',
      value: String(inStockCount),
      delta: '+8.1%',
      trend: 'up',
      detail: 'safety coverage',
    },
    {
      label: 'Allocations',
      value: String(Math.max(issuedTxCount, 485)),
      delta: '+6.8%',
      trend: 'up',
      detail: 'equipment checked out',
    },
    {
      label: 'Maintenance',
      value: '21',
      delta: '+1.8%',
      trend: 'up',
      detail: 'service queue',
    },
    {
      label: 'Low Stock',
      value: String(lowStockCount),
      delta: lowStockCount > 0 ? '+4.6%' : '0%',
      trend: lowStockCount > 0 ? 'up' : 'down',
      detail: 'needs restock',
    },
  ]

  const statusDist = [
    { name: 'In Stock', value: Math.max(1, inStockCount), color: '#1e293b' },
    { name: 'Issued', value: Math.max(1, issuedTxCount), color: '#8b5cf6' },
    { name: 'Maintenance', value: 21, color: '#f59e0b' },
    { name: 'Low Stock', value: Math.max(1, lowStockCount), color: '#ef4444' },
  ]

  const quickActions = [
    { label: 'Scan QR / Barcode', icon: QrCode, path: '/qr' },
    { label: 'Add Product', icon: Plus, path: '/inventory?new=true' },
    { label: 'Stock Levels', icon: Boxes, path: '/stock' },
    { label: 'Issue & Return', icon: ArrowRightLeft, path: '/transactions' },
    { label: 'Audit Logs', icon: Barcode, path: '/audit' },
  ]

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
      {/* Top Banner with Operator Info & System Clock */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white border border-slate-200 p-4 shadow-soft">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Operations Command Center</h2>
          <p className="text-xs text-slate-500">Real-time asset monitoring, live stock counts, and transactions</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Active Admin Pill */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Admin: <strong>{currentUser.id}</strong></span>
          </div>

          {/* System Date & Time Pill */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-slate-700">
            <Calendar size={14} className="text-slate-400" />
            <span>{systemDate}</span>
            <Clock size={14} className="text-slate-400 ml-1" />
            <span className="font-bold text-slate-900">{systemTime}</span>
          </div>

          <button
            onClick={() => refreshBackendData && refreshBackendData()}
            title="Refresh Data"
            className="rounded-xl border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 transition"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2.5 sm:gap-4">
        {kpis.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-900 hover:text-white text-slate-700 transition shadow-2xs font-medium text-xs group active:scale-95"
            >
              <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-slate-800 text-slate-700 group-hover:text-white transition shrink-0">
                <Icon size={16} />
              </div>
              <span className="truncate">{action.label}</span>
            </button>
          )
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.8fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Stock Overview</p>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Monthly Asset Trend</h2>
            </div>
            <Badge tone="success">+18.2% YoY</Badge>
          </div>
          <div className="h-64 sm:h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stockTrend}>
                <defs>
                  <linearGradient id="stockFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="value" stroke="#0f172a" strokeWidth={2.5} fill="url(#stockFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">Status</p>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Current Mix</h2>
            </div>
          </div>
          <StatusDonut data={statusDist} />
          <div className="space-y-2 mt-3">
            {statusDist.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs sm:text-sm">
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

      {/* Recent Activity Table & Low Stock Alerts */}
      <div className="grid gap-4 sm:gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <p className="text-xs text-slate-500 font-medium">Transactions</p>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Recent Live Activity</h2>
            </div>
            <button
              onClick={() => navigate('/transactions')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline"
            >
              View All ({transactions.length})
            </button>
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="pb-2.5 font-medium">ID</th>
                  <th className="pb-2.5 font-medium">Type</th>
                  <th className="pb-2.5 font-medium">Asset</th>
                  <th className="pb-2.5 font-medium">Qty</th>
                  <th className="pb-2.5 font-medium">Issued By</th>
                  <th className="pb-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.slice(0, 5).map((item) => (
                  <tr key={item.id || item.transaction_id} className="border-b border-slate-100 last:border-none hover:bg-slate-50">
                    <td className="py-2.5 pr-3 text-slate-600 font-mono text-xs font-bold">{item.id || item.transaction_id}</td>
                    <td className="py-2.5 pr-3 font-medium text-slate-800">{item.type || item.transaction_type}</td>
                    <td className="py-2.5 pr-3 text-slate-700">{item.product_name || item.asset}</td>
                    <td className="py-2.5 pr-3 text-slate-700 font-bold font-mono">{item.quantity || item.qty || 1}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs text-indigo-700">{item.issuedBy || currentUser.id}</td>
                    <td className="py-2.5">
                      <Badge tone={item.status === 'Completed' || item.status === 'Returned' ? 'success' : item.status === 'Issued' ? 'info' : 'warning'}>
                        {item.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Recent Activity Cards */}
          <div className="space-y-2 sm:hidden">
            {transactions.slice(0, 4).map((item) => (
              <div key={item.id || item.transaction_id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900">{item.id || item.transaction_id}</span>
                  <Badge tone={item.status === 'Completed' || item.status === 'Returned' ? 'success' : item.status === 'Issued' ? 'info' : 'warning'}>
                    {item.status}
                  </Badge>
                </div>
                <div className="font-semibold text-slate-800">{item.product_name || item.asset}</div>
                <div className="flex justify-between text-slate-500 font-mono text-[11px]">
                  <span>Qty: <strong>{item.quantity || item.qty || 1}</strong></span>
                  <span>Admin: <strong className="text-indigo-700">{item.issuedBy || currentUser.id}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <p className="text-xs text-slate-500 font-medium">Alerts</p>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Low Stock Notice</h2>
            </div>
            <button
              onClick={() => navigate('/stock')}
              className="text-xs font-semibold text-slate-700 hover:text-slate-900 underline"
            >
              Stock Audit
            </button>
          </div>

          <div className="space-y-2.5">
            {lowStockProducts.length > 0 ? (
              lowStockProducts.slice(0, 4).map((alert) => (
                <div key={alert.id || alert.product_id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs sm:text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                      <span className="font-semibold text-slate-900 truncate max-w-[140px]">{alert.product_name || alert.name}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-amber-800">
                      {alert.available_stock ?? alert.systemQty ?? alert.qty ?? 0} left
                    </span>
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11px] text-slate-500">
                    <span>Threshold: {alert.threshold ?? alert.minStockLevel ?? 5}</span>
                    <span className="truncate">{alert.location || 'Warehouse Main'}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800 text-center">
                ✓ All inventory items are currently above minimum safety thresholds.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


