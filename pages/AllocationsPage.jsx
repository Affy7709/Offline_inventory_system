import { useState, useEffect } from 'react';
import { getApiBase, apiFetch } from '../api';

export default function AllocationsPage() {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [typeFilter, setTypeFilter]   = useState('');

  useEffect(() => {
    const base = getApiBase();
    apiFetch(`${base}/index.php?action=allocations`)
      .then(r => r.json())
      .then(d => setAllocations(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = typeFilter
    ? allocations.filter(a => a.type === typeFilter)
    : allocations;

  const issueCount  = allocations.filter(a => a.type === 'issue').length;
  const returnCount = allocations.filter(a => a.type === 'return').length;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">User & Department Allocations</h1>
        <p className="text-sm text-text-secondary mt-1">Track asset allocations across users and departments</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 stagger">
        <div className="card p-4 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-danger-bg flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-danger" style={{ fontSize: '18px' }}>arrow_upward</span>
          </div>
          <div className="text-2xl font-bold text-danger">{issueCount}</div>
          <div className="text-xs text-text-tertiary mt-0.5">Total Issues</div>
        </div>
        <div className="card p-4 animate-fade-in">
          <div className="w-8 h-8 rounded-lg bg-success-bg flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-success" style={{ fontSize: '18px' }}>arrow_downward</span>
          </div>
          <div className="text-2xl font-bold text-success">{returnCount}</div>
          <div className="text-xs text-text-tertiary mt-0.5">Total Returns</div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-bold text-text-primary">Allocation Records</h2>
          <select
            className="input-field w-auto text-sm"
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            <option value="issue">Issues only</option>
            <option value="return">Returns only</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: '600px' }}>
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">User / Department</th>
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length > 0 ? filtered.map(a => (
                <tr key={a.id} className="hover:bg-surface-raised transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-text-tertiary">
                    {String(a.transaction_date ?? '').split('T')[0]}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-sm text-text-primary">{a.username || '—'}</div>
                    <div className="text-xs text-text-tertiary">{a.dept_name || 'General'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-text-primary">{a.product_name}</div>
                    <div className="text-xs font-mono text-text-tertiary">{a.sku}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-text-primary">{a.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${a.type === 'issue' ? 'badge-danger' : 'badge-success'}`}>
                      {a.type === 'issue' ? 'Issued' : 'Returned'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{a.notes || '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-border mb-3 block">group</span>
                    <p className="text-text-secondary font-medium">No allocations recorded yet.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-surface">
            <span className="text-xs text-text-tertiary">{filtered.length} records</span>
          </div>
        )}
      </div>
    </div>
  );
}
