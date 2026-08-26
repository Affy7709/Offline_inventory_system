import { useState, useEffect } from 'react';
import { getApiBase, apiFetch } from '../api';
import { Folder, FolderOpen, Plus, X } from 'lucide-react';
import { Badge } from '../components/ui/Badge';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

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
    setLoading(true);
    const apiBase = getApiBase();
    try {
      const [cRes, sRes] = await Promise.all([
        apiFetch(`${apiBase}/index.php?action=categories`),
        apiFetch(`${apiBase}/index.php?action=subcategories`)
      ]);
      setCategories(cRes.ok ? await cRes.json() : []);
      setSubcategories(sRes.ok ? await sRes.json() : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSubmittingCat(true);
    const apiBase = getApiBase();

    await apiFetch(`${apiBase}/index.php?action=categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: catName })
    });
    setCatName('');
    setShowAddCategory(false);
    setSubmittingCat(false);
    fetchData();
  };

  const handleAddSubcategory = async (e) => {
    e.preventDefault();
    if (!subForm.category_id || !subForm.name.trim()) return;
    setSubmittingSub(true);
    const apiBase = getApiBase();

    await apiFetch(`${apiBase}/index.php?action=subcategories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subForm)
    });
    setSubForm({ category_id: '', name: '' });
    setShowAddSub(false);
    setSubmittingSub(false);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-slate-400">
        Loading categories...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Classification</p>
            <h2 className="text-2xl font-semibold text-slate-900">Categories & Subcategories</h2>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Master Categories */}
        <div className="flex h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                <Folder size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Master Categories</h2>
                <p className="text-xs text-slate-500">{categories.length} total</p>
              </div>
            </div>
            <button 
              onClick={() => setShowAddCategory(true)} 
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-white p-3">
            {categories.length > 0 ? (
              <div className="space-y-2">
                {categories.map(c => (
                  <div key={c.id} className="group flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition-colors hover:border-slate-300 hover:bg-slate-50/50">
                    <div className="flex items-center gap-3">
                      <Folder size={18} className="text-slate-400 transition-colors group-hover:text-blue-500" />
                      <span className="text-sm font-medium text-slate-900">{c.name}</span>
                    </div>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600">#{c.id}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <Folder size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">No categories yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Subcategories */}
        <div className="flex h-[500px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                <FolderOpen size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Subcategories</h2>
                <p className="text-xs text-slate-500">{subcategories.length} total</p>
              </div>
            </div>
            <button 
              onClick={() => setShowAddSub(true)} 
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              <Plus size={16} />
              Add
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-white p-3">
            {subcategories.length > 0 ? (
              <div className="space-y-2">
                {subcategories.map(s => (
                  <div key={s.id} className="group flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3 transition-colors hover:border-slate-300 hover:bg-slate-50/50">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{s.name}</div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                        <span className="text-[10px]">↳</span>
                        {s.category_name}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600">#{s.id}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <FolderOpen size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-sm text-slate-500">No subcategories yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">New Category</h3>
              <button onClick={() => setShowAddCategory(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <p className="mb-5 text-sm text-slate-500">Add a master product category</p>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Category Name</label>
                <input 
                  type="text" 
                  value={catName} 
                  placeholder="e.g. Electronics" 
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900" 
                  required 
                  autoFocus 
                  onChange={e => setCatName(e.target.value)} 
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddCategory(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submittingCat} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-slate-800">
                  {submittingCat ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subcategory Modal */}
      {showAddSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">New Subcategory</h3>
              <button onClick={() => setShowAddSub(false)} className="rounded-lg p-1 text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <p className="mb-5 text-sm text-slate-500">Create under a parent category</p>
            <form onSubmit={handleAddSubcategory} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Parent Category</label>
                <select 
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900" 
                  required 
                  value={subForm.category_id} 
                  onChange={e => setSubForm({ ...subForm, category_id: e.target.value })}
                >
                  <option value="">Select category...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Subcategory Name</label>
                <input 
                  type="text" 
                  value={subForm.name} 
                  placeholder="e.g. Scanners" 
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900" 
                  required 
                  onChange={e => setSubForm({ ...subForm, name: e.target.value })} 
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddSub(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={submittingSub} className="rounded-xl bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 hover:bg-slate-800">
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
