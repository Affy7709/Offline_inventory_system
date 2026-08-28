import { useState, useEffect } from 'react';
import { getApiBase, apiFetch } from '../../api';
import { Folder, FolderOpen, Plus, X, Tags, Trash2 } from 'lucide-react';

const INITIAL_CATEGORIES = [
  { id: 1, name: 'Computing', count: 124 },
  { id: 2, name: 'Scanning & Barcode', count: 88 },
  { id: 3, name: 'Networking', count: 45 },
  { id: 4, name: 'Printing & POS', count: 62 },
  { id: 5, name: 'Mobile Devices', count: 93 },
];

const INITIAL_SUBCATEGORIES = [
  { id: 1, category_id: 1, category_name: 'Computing', name: 'Laptops' },
  { id: 2, category_id: 1, category_name: 'Computing', name: 'Desktop Workstations' },
  { id: 3, category_id: 1, category_name: 'Computing', name: 'Monitors & Displays' },
  { id: 4, category_id: 2, category_name: 'Scanning & Barcode', name: 'Handheld Laser Scanners' },
  { id: 5, category_id: 2, category_name: 'Scanning & Barcode', name: '2D / QR Readers' },
  { id: 6, category_id: 2, category_name: 'Scanning & Barcode', name: 'Industrial Fixed Scanners' },
  { id: 7, category_id: 3, category_name: 'Networking', name: 'Routers & Gateways' },
  { id: 8, category_id: 3, category_name: 'Networking', name: 'Managed Switches' },
  { id: 9, category_id: 4, category_name: 'Printing & POS', name: 'Thermal Label Printers' },
  { id: 10, category_id: 5, category_name: 'Mobile Devices', name: 'Enterprise Rugged Tablets' },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [subcategories, setSubcategories] = useState(INITIAL_SUBCATEGORIES);
  const [loading, setLoading] = useState(false);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [catName, setCatName] = useState('');
  const [submittingCat, setSubmittingCat] = useState(false);

  const [showAddSub, setShowAddSub] = useState(false);
  const [subForm, setSubForm] = useState({ category_id: '', name: '' });
  const [submittingSub, setSubmittingSub] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const apiBase = getApiBase();
      const [cRes, sRes] = await Promise.allSettled([
        apiFetch(`${apiBase}/index.php?action=categories`),
        apiFetch(`${apiBase}/index.php?action=subcategories`)
      ]);

      if (cRes.status === 'fulfilled' && cRes.value.ok) {
        const cData = await cRes.value.json();
        if (Array.isArray(cData) && cData.length > 0) setCategories(cData);
      }
      if (sRes.status === 'fulfilled' && sRes.value.ok) {
        const sData = await sRes.value.json();
        if (Array.isArray(sData) && sData.length > 0) setSubcategories(sData);
      }
    } catch {
      // Use fallback initial mock data
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSubmittingCat(true);

    try {
      const apiBase = getApiBase();
      await apiFetch(`${apiBase}/index.php?action=categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: catName.trim() })
      });
    } catch {
      // ignore
    }

    const newId = categories.length > 0 ? Math.max(...categories.map(c => Number(c.id) || 0)) + 1 : 1;
    setCategories(prev => [...prev, { id: newId, name: catName.trim() }]);
    setCatName('');
    setShowAddCategory(false);
    setSubmittingCat(false);
  };

  const handleAddSubcategory = async (e) => {
    e.preventDefault();
    if (!subForm.category_id || !subForm.name.trim()) return;
    setSubmittingSub(true);

    const parent = categories.find(c => String(c.id) === String(subForm.category_id));

    try {
      const apiBase = getApiBase();
      await apiFetch(`${apiBase}/index.php?action=subcategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subForm)
      });
    } catch {
      // ignore
    }

    const newId = subcategories.length > 0 ? Math.max(...subcategories.map(s => Number(s.id) || 0)) + 1 : 1;
    setSubcategories(prev => [
      ...prev,
      {
        id: newId,
        category_id: subForm.category_id,
        category_name: parent ? parent.name : 'Category',
        name: subForm.name.trim(),
      }
    ]);

    setSubForm({ category_id: '', name: '' });
    setShowAddSub(false);
    setSubmittingSub(false);
  };

  const handleDeleteCategory = (id) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setSubcategories(prev => prev.filter(s => String(s.category_id) !== String(id)));
  };

  const handleDeleteSubcategory = (id) => {
    setSubcategories(prev => prev.filter(s => s.id !== id));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Loading classification data...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Tags size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Classification</p>
              <h2 className="text-2xl font-bold text-slate-900">Categories & Subcategories</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddCategory(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus size={16} />
              Add Category
            </button>
            <button
              onClick={() => setShowAddSub(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Plus size={16} />
              Add Subcategory
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Master Categories */}
        <div className="flex h-[600px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/70 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Folder size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Master Categories</h3>
                <p className="text-xs text-slate-500">{categories.length} main categories configured</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddCategory(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700"
            >
              <Plus size={14} />
              New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {categories.length > 0 ? (
              <div className="space-y-2.5">
                {categories.map((c) => {
                  const subCount = subcategories.filter(s => String(s.category_id) === String(c.id) || s.category_name === c.name).length;
                  return (
                    <div
                      key={c.id}
                      className="group flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-xs transition hover:border-slate-300 hover:bg-slate-50/70"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <Folder size={16} />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-slate-900">{c.name}</span>
                          <span className="ml-2 text-xs text-slate-400">({subCount} subcategories)</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600">
                          ID: #{c.id}
                        </span>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="rounded-lg p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                <Folder size={40} className="mb-2 stroke-1 text-slate-300" />
                <p className="text-sm font-medium">No master categories yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Subcategories */}
        <div className="flex h-[600px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/70 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                <FolderOpen size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Subcategories</h3>
                <p className="text-xs text-slate-500">{subcategories.length} subcategories configured</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddSub(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-700"
            >
              <Plus size={14} />
              New
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {subcategories.length > 0 ? (
              <div className="space-y-2.5">
                {subcategories.map((s) => (
                  <div
                    key={s.id}
                    className="group flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3.5 shadow-xs transition hover:border-slate-300 hover:bg-slate-50/70"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">{s.name}</div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-700">
                          {s.category_name || categories.find(c => String(c.id) === String(s.category_id))?.name || 'Category'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600">
                        #{s.id}
                      </span>
                      <button
                        onClick={() => handleDeleteSubcategory(s.id)}
                        className="rounded-lg p-1 text-slate-300 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                <FolderOpen size={40} className="mb-2 stroke-1 text-slate-300" />
                <p className="text-sm font-medium">No subcategories yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add Master Category</h3>
              <button
                onClick={() => setShowAddCategory(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-5 text-sm text-slate-500">Create a top-level product category classification.</p>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Category Name</label>
                <input
                  type="text"
                  value={catName}
                  placeholder="e.g. Warehouse Equipment"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  required
                  autoFocus
                  onChange={(e) => setCatName(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddCategory(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCat}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {submittingCat ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subcategory Modal */}
      {showAddSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Add Subcategory</h3>
              <button
                onClick={() => setShowAddSub(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <p className="mb-5 text-sm text-slate-500">Group items under a specific parent category.</p>
            <form onSubmit={handleAddSubcategory} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Parent Category</label>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  required
                  value={subForm.category_id}
                  onChange={(e) => setSubForm({ ...subForm, category_id: e.target.value })}
                >
                  <option value="">Select master category...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Subcategory Name</label>
                <input
                  type="text"
                  value={subForm.name}
                  placeholder="e.g. Barcode Scanners"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10"
                  required
                  onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddSub(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingSub}
                  className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-50"
                >
                  {submittingSub ? 'Saving...' : 'Save Subcategory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
