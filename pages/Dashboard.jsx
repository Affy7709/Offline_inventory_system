import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getApiBase, apiFetch } from '../api';

export default function Dashboard() {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const apiBase = getApiBase();
    apiFetch(`${apiBase}/index.php?action=dashboard`)
    .then(r => {
      if (r.status === 401) { navigate('/login', { replace: true }); return null; }
      return r.json();
    })
    .then(d => { if (d) setData(d); })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const chartData = (data.lowStockItems || []).map(i => ({
    name: i.name?.length > 12 ? i.name.substring(0, 12) + '…' : i.name,
    stock: Number(i.current_stock),
    min: Number(i.min_stock_level)
  }));

  const stats = [
    { label: 'Total Products', value: data.totalProducts || 0, icon: 'inventory_2', color: 'bg-primary-light text-primary', iconBg: 'bg-primary' },
    { label: 'Low Stock Alerts', value: data.lowStockCount || 0, icon: 'warning', color: 'bg-danger-bg text-danger', iconBg: 'bg-danger' },
    { label: 'Recent Issues', value: (data.recentTransactions || []).filter(t => t.type === 'issue').length, icon: 'arrow_upward', color: 'bg-warning-bg text-warning', iconBg: 'bg-warning' },
    { label: 'Recent Returns', value: (data.recentTransactions || []).filter(t => t.type === 'return').length, icon: 'arrow_downward', color: 'bg-success-bg text-success', iconBg: 'bg-success' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Dashboard</h1>
          <p className="text-sm text-text-secondary mt-1">Overview of your warehouse inventory</p>
        </div>
        <Link to="/scanner" className="btn-primary w-full sm:w-auto justify-center">
          <span className="material-symbols-outlined text-lg">barcode_scanner</span>
          Scan & Issue
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 stagger">
        {stats.map((s, i) => (
          <div key={i} className="card p-4 animate-fade-in">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${s.iconBg} flex items-center justify-center shadow-sm flex-shrink-0`}>
                <span className="material-symbols-outlined text-white" style={{fontSize:'20px'}}>{s.icon}</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-text-primary">{s.value}</div>
            <div className="text-xs font-medium text-text-tertiary mt-0.5 leading-tight">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts + Activity Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Low Stock Chart */}
        <div className="lg:col-span-3 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-text-primary">Low Stock Items</h2>
              <p className="text-xs text-text-tertiary mt-0.5">Items below minimum threshold</p>
            </div>
            <span className="badge badge-danger">
              <span className="material-symbols-outlined text-xs">warning</span>
              {data.lowStockCount || 0} alerts
            </span>
          </div>
          {chartData.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
                  <XAxis 
                    dataKey="name" 
                    stroke="#94A3B8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94A3B8" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(79, 70, 229, 0.04)' }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: '1px solid #E2E8F0', 
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                      fontSize: '13px'
                    }}
                  />
                  <Bar dataKey="stock" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={40} name="Current Stock" />
                  <Bar dataKey="min" fill="#E2E8F0" radius={[6, 6, 0, 0]} maxBarSize={40} name="Min Level" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-text-tertiary">
              <div className="text-center">
                <span className="material-symbols-outlined text-4xl text-border mb-2 block">check_circle</span>
                <p className="text-sm font-medium">All stock levels are healthy</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-base font-bold text-text-primary">Recent Activity</h2>
            <Link to="/reports" className="text-xs font-semibold text-primary hover:text-primary-hover transition-colors">View all →</Link>
          </div>
          <div className="flex-1 space-y-3 overflow-auto">
            {(data.recentTransactions || []).length > 0 ? (
              (data.recentTransactions || []).map(t => (
                <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-raised transition-colors group">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    t.type === 'issue' ? 'bg-danger-bg' : 'bg-success-bg'
                  }`}>
                    <span className={`material-symbols-outlined text-lg ${
                      t.type === 'issue' ? 'text-danger' : 'text-success'
                    }`}>
                      {t.type === 'issue' ? 'arrow_upward' : 'arrow_downward'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-text-primary truncate">{t.product_name}</div>
                    <div className="text-xs text-text-tertiary">{t.username} • {t.type?.toUpperCase()}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-sm font-bold ${t.type === 'issue' ? 'text-danger' : 'text-success'}`}>
                      {t.type === 'issue' ? '-' : '+'}{t.quantity}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex-1 flex items-center justify-center text-center py-8">
                <div>
                  <span className="material-symbols-outlined text-3xl text-border block mb-2">history</span>
                  <p className="text-sm text-text-tertiary">No activity yet</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
