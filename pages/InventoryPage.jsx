import { useState, useEffect } from 'react';
import { getApiBase, apiFetch } from '../api';

export default function InventoryPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const base = getApiBase();
    apiFetch(`${base}/index.php?action=products`)
      .then(r => r.json())
      .then(d => setProducts(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const categories = [...new Set(products.map(p => p.subcategory_name).filter(Boolean))].sort();

  const getStatus = (p) => {
    if (Number(p.current_stock) === 0)
      return { label: 'Out of Stock', cls: 'badge-danger' };
    if (Number(p.current_stock) <= Number(p.min_stock_level))
      return { label: 'Low Stock', cls: 'badge-warning' };
    return { label: 'In Stock', cls: 'badge-success' };
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q);
    const matchCat = !categoryFilter || p.subcategory_name === categoryFilter;
    const status = getStatus(p).label;
    const matchStatus = !statusFilter || status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <p className="text-sm text-text-tertiary">Inventory</p>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Product Catalog</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-tertiary"
            style={{ fontSize: '18px' }}
          >
            search
          </span>
          <input
            className="input-field input-with-icon"
            placeholder="Search products, SKU…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input-field md:w-48"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="input-field md:w-40"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="In Stock">In Stock</option>
          <option value="Low Stock">Low Stock</option>
          <option value="Out of Stock">Out of Stock</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: '600px' }}>
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                <th className="px-4 py-3">Asset</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-center">Threshold</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length > 0 ? filtered.map(p => {
                const status = getStatus(p);
                return (
                  <tr key={p.id} className="hover:bg-surface-raised transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-sm text-text-primary">{p.name}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{p.subcategory_name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-text-tertiary">{p.sku}</td>
                    <td className="px-4 py-3 text-center font-bold text-text-primary">{p.current_stock}</td>
                    <td className="px-4 py-3 text-center text-text-secondary">{p.min_stock_level}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${status.cls}`}>{status.label}</span>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-border mb-3 block">inventory_2</span>
                    <p className="text-text-secondary font-medium">No products found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-surface">
            <span className="text-xs text-text-tertiary">{filtered.length} of {products.length} products</span>
          </div>
        )}
      </div>
    </div>
  );
}
