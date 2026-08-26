import { useState, useEffect } from 'react';
import { getApiBase, apiFetch } from '../api';

export default function StockPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = getApiBase();
    apiFetch(`${base}/index.php?action=stock_summary`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
    </div>
  );

  const kpis = [
    {
      label: 'Stock In',
      value: data?.stockIn ?? 0,
      sub: 'This month',
      icon: 'arrow_downward',
      iconBg: 'bg-success',
      textCls: 'text-success',
    },
    {
      label: 'Stock Out',
      value: data?.stockOut ?? 0,
      sub: 'This month',
      icon: 'arrow_upward',
      iconBg: 'bg-danger',
      textCls: 'text-danger',
    },
    {
      label: 'Audit Corrections',
      value: data?.auditCorrections ?? 0,
      sub: 'Last 30 days',
      icon: 'edit_note',
      iconBg: 'bg-warning',
      textCls: 'text-warning',
    },
  ];

  const products = data?.products ?? [];

  const getStatus = (p) => {
    if (Number(p.current_stock) === 0)
      return { label: 'Out of Stock', cls: 'badge-danger' };
    if (Number(p.current_stock) <= Number(p.min_stock_level))
      return { label: 'Low Stock', cls: 'badge-warning' };
    return { label: 'In Stock', cls: 'badge-success' };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Stock Management</h1>
        <p className="text-sm text-text-secondary mt-1">Monthly stock movement and threshold overview</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger">
        {kpis.map((k, i) => (
          <div key={i} className="card p-5 animate-fade-in">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${k.iconBg} flex items-center justify-center shadow-sm`}>
                <span className="material-symbols-outlined text-white" style={{ fontSize: '20px' }}>{k.icon}</span>
              </div>
            </div>
            <div className={`text-3xl font-bold ${k.textCls}`}>{k.value}</div>
            <div className="text-sm font-semibold text-text-primary mt-1">{k.label}</div>
            <div className="text-xs text-text-tertiary mt-0.5">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Threshold Table */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-bold text-text-primary">Stock Thresholds</h2>
            <p className="text-xs text-text-tertiary mt-0.5">Items ordered by lowest current stock</p>
          </div>
          <span className="badge badge-danger">
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>warning</span>
            {products.filter(p => Number(p.current_stock) <= Number(p.min_stock_level)).length} low
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: '500px' }}>
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-center">Current Qty</th>
                <th className="px-4 py-3 text-center">Threshold</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length > 0 ? products.map(p => {
                const status = getStatus(p);
                const isLow = Number(p.current_stock) <= Number(p.min_stock_level);
                return (
                  <tr key={p.id} className={`hover:bg-surface-raised transition-colors ${isLow ? 'bg-danger-bg/20' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm text-text-primary">{p.name}</div>
                      <div className="text-xs font-mono text-text-tertiary">{p.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{p.subcategory_name || '—'}</td>
                    <td className={`px-4 py-3 text-center font-bold text-lg ${isLow ? 'text-danger' : 'text-text-primary'}`}>
                      {p.current_stock}
                    </td>
                    <td className="px-4 py-3 text-center text-text-secondary">{p.min_stock_level}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${status.cls}`}>{status.label}</span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="p-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-border mb-3 block">inventory</span>
                    <p className="text-text-secondary font-medium">No products found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
