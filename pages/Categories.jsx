import { useState, useEffect } from 'react';
import { getApiBase, apiFetch } from '../api';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [catName, setCatName] = useState('');

  const [showAddSub, setShowAddSub] = useState(false);
  const [subForm, setSubForm] = useState({ category_id: '', name: '' });

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
    const apiBase = getApiBase();

    await apiFetch(`${apiBase}/index.php?action=categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: catName })
    });
    setCatName('');
    setShowAddCategory(false);
    fetchData();
  };

  const handleAddSubcategory = async (e) => {
    e.preventDefault();
    if (!subForm.category_id || !subForm.name.trim()) return;
    const apiBase = getApiBase();

    await apiFetch(`${apiBase}/index.php?action=subcategories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subForm)
    });
    setSubForm({ category_id: '', name: '' });
    setShowAddSub(false);
    fetchData();
  };

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
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Categories</h1>
        <p className="text-sm text-text-secondary mt-1">Organize products into groups and subgroups</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Master Categories ── */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between bg-surface">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg">folder</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">Categories</h2>
                <p className="text-xs text-text-tertiary">{categories.length} total</p>
              </div>
            </div>
            <button onClick={() => setShowAddCategory(true)} className="btn-primary text-xs px-3 py-2">
              <span className="material-symbols-outlined text-sm">add</span>
              Add
            </button>
          </div>
          <div className="p-3 max-h-[420px] overflow-y-auto">
            {categories.length > 0 ? (
              <div className="space-y-1">
                {categories.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-surface-raised transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-text-tertiary group-hover:text-primary transition-colors text-xl">folder</span>
                      <span className="font-medium text-sm text-text-primary">{c.name}</span>
                    </div>
                    <span className="badge badge-neutral text-xs font-mono">#{c.id}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-4xl text-border block mb-2">folder_off</span>
                <p className="text-sm text-text-tertiary">No categories yet</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Subcategories ── */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-border flex items-center justify-between bg-surface">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg">folder_open</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">Subcategories</h2>
                <p className="text-xs text-text-tertiary">{subcategories.length} total</p>
              </div>
            </div>
            <button onClick={() => setShowAddSub(true)} className="btn-primary text-xs px-3 py-2">
              <span className="material-symbols-outlined text-sm">add</span>
              Add
            </button>
          </div>
          <div className="p-3 max-h-[420px] overflow-y-auto">
            {subcategories.length > 0 ? (
              <div className="space-y-1">
                {subcategories.map(s => (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-surface-raised transition-colors group">
                    <div className="min-w-0">
                      <div className="font-medium text-sm text-text-primary truncate">{s.name}</div>
                      <div className="text-xs text-text-tertiary mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">subdirectory_arrow_right</span>
                        {s.category_name}
                      </div>
                    </div>
                    <span className="badge badge-neutral text-xs font-mono flex-shrink-0">#{s.id}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <span className="material-symbols-outlined text-4xl text-border block mb-2">folder_off</span>
                <p className="text-sm text-text-tertiary">No subcategories yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Add Category Modal ── */}
      {showAddCategory && (
        <div className="modal-overlay" onClick={() => setShowAddCategory(false)}>
          <div className="modal-content max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-text-primary mb-1">New Category</h2>
            <p className="text-sm text-text-tertiary mb-5">Add a master product category</p>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Category Name</label>
                <input 
                  type="text" 
                  value={catName} 
                  placeholder="e.g. Electronics" 
                  className="input-field" 
                  required 
                  autoFocus 
                  onChange={e => setCatName(e.target.value)} 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowAddCategory(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Subcategory Modal ── */}
      {showAddSub && (
        <div className="modal-overlay" onClick={() => setShowAddSub(false)}>
          <div className="modal-content max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-text-primary mb-1">New Subcategory</h2>
            <p className="text-sm text-text-tertiary mb-5">Create under a parent category</p>
            <form onSubmit={handleAddSubcategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Parent Category</label>
                <select 
                  className="input-field" 
                  required 
                  value={subForm.category_id} 
                  onChange={e => setSubForm({ ...subForm, category_id: e.target.value })}
                >
                  <option value="">Select category...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Subcategory Name</label>
                <input 
                  type="text" 
                  value={subForm.name} 
                  placeholder="e.g. Scanners" 
                  className="input-field" 
                  required 
                  onChange={e => setSubForm({ ...subForm, name: e.target.value })} 
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowAddSub(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
