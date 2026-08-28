import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Folder, 
  Layers, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  X, 
  Check, 
  RefreshCw, 
  AlertCircle,
  Package,
  ChevronRight
} from 'lucide-react';
import { getApiBase, apiFetch } from '../api';

export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Selected parent category to filter subcategories ('ALL' or category id)
  const [selectedCatId, setSelectedCatId] = useState('ALL');
  const [search, setSearch] = useState('');

  // Toast
  const [toast, setToast] = useState(null);

  // Modals
  const [modalType, setModalType] = useState(null); // 'addCat' | 'editCat' | 'addSub' | 'editSub' | 'deleteCat' | 'deleteSub'
  const [activeItem, setActiveItem] = useState(null);
  const [catNameInput, setCatNameInput] = useState('');
  const [subFormInput, setSubFormInput] = useState({ category_id: '', name: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    const base = getApiBase();
    try {
      const [cRes, sRes] = await Promise.all([
        apiFetch(`${base}/index.php?action=categories`),
        apiFetch(`${base}/index.php?action=subcategories`)
      ]);
      const cData = cRes.ok ? await cRes.json() : [];
      const sData = sRes.ok ? await sRes.json() : [];
      setCategories(Array.isArray(cData) ? cData : []);
      setSubcategories(Array.isArray(sData) ? sData : []);
    } catch (e) {
      console.error(e);
      showToast('Failed to load categories', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ── Modal Handlers ──
  const openAddCategory = () => {
    setCatNameInput('');
    setActiveItem(null);
    setModalType('addCat');
  };

  const openEditCategory = (cat, e) => {
    e?.stopPropagation();
    setCatNameInput(cat.name);
    setActiveItem(cat);
    setModalType('editCat');
  };

  const openDeleteCategory = (cat, e) => {
    e?.stopPropagation();
    setActiveItem(cat);
    setModalType('deleteCat');
  };

  const openAddSubcategory = (preselectedId = null) => {
    const parentId = preselectedId || (selectedCatId !== 'ALL' ? selectedCatId : (categories[0]?.id ? String(categories[0].id) : ''));
    setSubFormInput({ category_id: String(parentId), name: '' });
    setActiveItem(null);
    setModalType('addSub');
  };

  const openEditSubcategory = (sub, e) => {
    e?.stopPropagation();
    setSubFormInput({ category_id: String(sub.category_id), name: sub.name });
    setActiveItem(sub);
    setModalType('editSub');
  };

  const openDeleteSubcategory = (sub, e) => {
    e?.stopPropagation();
    setActiveItem(sub);
    setModalType('deleteSub');
  };

  const closeModal = () => {
    setModalType(null);
    setActiveItem(null);
    setCatNameInput('');
    setSubFormInput({ category_id: '', name: '' });
  };

  // ── Save / Delete API Calls ──
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    const name = catNameInput.trim();
    if (!name) return;
    setSubmitting(true);
    const base = getApiBase();

    try {
      const isEdit = modalType === 'editCat';
      const body = isEdit 
        ? { action: 'update', id: activeItem.id, name } 
        : { name };

      const res = await apiFetch(`${base}/index.php?action=categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isEdit ? 'Category updated' : 'Category created');
        closeModal();
        fetchData(true);
      } else {
        showToast(data.error || 'Operation failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!activeItem) return;
    setSubmitting(true);
    const base = getApiBase();

    try {
      const res = await apiFetch(`${base}/index.php?action=categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: activeItem.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (String(selectedCatId) === String(activeItem.id)) {
          setSelectedCatId('ALL');
        }
        showToast('Category deleted');
        closeModal();
        fetchData(true);
      } else {
        showToast(data.error || 'Failed to delete', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveSubcategory = async (e) => {
    e.preventDefault();
    const name = subFormInput.name.trim();
    const category_id = Number(subFormInput.category_id);
    if (!name || !category_id) return;
    setSubmitting(true);
    const base = getApiBase();

    try {
      const isEdit = modalType === 'editSub';
      const body = isEdit
        ? { action: 'update', id: activeItem.id, category_id, name }
        : { category_id, name };

      const res = await apiFetch(`${base}/index.php?action=subcategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isEdit ? 'Subcategory updated' : 'Subcategory created');
        closeModal();
        fetchData(true);
      } else {
        showToast(data.error || 'Operation failed', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async () => {
    if (!activeItem) return;
    setSubmitting(true);
    const base = getApiBase();

    try {
      const res = await apiFetch(`${base}/index.php?action=subcategories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id: activeItem.id })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Subcategory deleted');
        closeModal();
        fetchData(true);
      } else {
        showToast(data.error || 'Failed to delete', 'error');
      }
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Map subcategory count to categories
  const subCountMap = useMemo(() => {
    const map = {};
    subcategories.forEach(s => {
      map[s.category_id] = (map[s.category_id] || 0) + 1;
    });
    return map;
  }, [subcategories]);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(c => c.name.toLowerCase().includes(q));
  }, [categories, search]);

  // Filtered subcategories
  const filteredSubcategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subcategories.filter(s => {
      const matchParent = selectedCatId === 'ALL' || String(s.category_id) === String(selectedCatId);
      if (!matchParent) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.category_name?.toLowerCase().includes(q);
    });
  }, [subcategories, selectedCatId, search]);

  const activeCategoryObject = categories.find(c => String(c.id) === String(selectedCatId));

  if (loading) {
    return (
      <div className="flex h-72 items-center justify-center text-slate-400">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800"></div>
          <span>Loading categories...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 md:p-6 font-sans max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast.type === 'error' ? <AlertCircle size={16} className="text-rose-400" /> : <Check size={16} className="text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Clean Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories & Subcategories</h1>
          <p className="text-sm text-slate-500 mt-0.5">Organize and manage your product classifications</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => openAddSubcategory()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            <Plus size={16} />
            <span>Add Subcategory</span>
          </button>
          <button
            onClick={openAddCategory}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition"
          >
            <Plus size={16} />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Clean Search Bar */}
      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search categories or subcategories..."
          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-sm outline-none focus:border-slate-400"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Two-Column Side-by-Side Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Master Categories List (5 cols) */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <Folder size={18} className="text-slate-700" />
              <span className="font-semibold text-sm text-slate-900">Categories</span>
              <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {categories.length}
              </span>
            </div>
            <button
              onClick={openAddCategory}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              + New
            </button>
          </div>

          <div className="p-2 space-y-1 max-h-[600px] overflow-y-auto">
            {/* "All Categories" Tab */}
            <div
              onClick={() => setSelectedCatId('ALL')}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm cursor-pointer transition ${
                selectedCatId === 'ALL'
                  ? 'bg-slate-900 text-white font-medium'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Folder size={16} className={selectedCatId === 'ALL' ? 'text-white' : 'text-slate-400'} />
                <span>All Categories</span>
              </div>
              <span className={`text-xs rounded-md px-2 py-0.5 ${
                selectedCatId === 'ALL' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
              }`}>
                {subcategories.length} subs
              </span>
            </div>

            {/* Category Items */}
            {filteredCategories.length > 0 ? (
              filteredCategories.map(cat => {
                const isSelected = String(selectedCatId) === String(cat.id);
                const subCount = subCountMap[cat.id] || 0;
                return (
                  <div
                    key={cat.id}
                    onClick={() => setSelectedCatId(cat.id)}
                    className={`group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm cursor-pointer transition ${
                      isSelected
                        ? 'bg-slate-900 text-white font-medium shadow-xs'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate min-w-0 pr-2">
                      <Folder size={16} className={isSelected ? 'text-white' : 'text-slate-400'} />
                      <span className="truncate">{cat.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs rounded-md px-2 py-0.5 ${
                        isSelected ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {subCount} subs
                      </span>

                      {/* Action buttons */}
                      <button
                        onClick={(e) => openEditCategory(cat, e)}
                        className={`rounded-md p-1 transition ${
                          isSelected ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-400'
                        }`}
                        title="Edit category"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={(e) => openDeleteCategory(cat, e)}
                        className={`rounded-md p-1 transition ${
                          isSelected ? 'hover:bg-rose-900 text-rose-300' : 'hover:bg-rose-50 text-rose-500'
                        }`}
                        title="Delete category"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No categories match your search.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Subcategories Table (7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <Layers size={18} className="text-slate-700" />
              <span className="font-semibold text-sm text-slate-900">
                {activeCategoryObject ? activeCategoryObject.name : 'All Subcategories'}
              </span>
              <span className="rounded-full bg-slate-200/80 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {filteredSubcategories.length}
              </span>
            </div>

            <button
              onClick={() => openAddSubcategory(selectedCatId !== 'ALL' ? selectedCatId : null)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              + Add Subcategory
            </button>
          </div>

          <div className="p-0 overflow-x-auto max-h-[600px] overflow-y-auto">
            {filteredSubcategories.length > 0 ? (
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase text-slate-400 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-2.5">Subcategory Name</th>
                    {selectedCatId === 'ALL' && <th className="px-4 py-2.5">Parent Category</th>}
                    <th className="px-4 py-2.5">Products</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSubcategories.map(sub => (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {sub.name}
                      </td>

                      {selectedCatId === 'ALL' && (
                        <td className="px-4 py-3">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                            {sub.category_name}
                          </span>
                        </td>
                      )}

                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/inventory?subcategory=${encodeURIComponent(sub.name)}`)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                          title="View items in inventory"
                        >
                          <Package size={13} />
                          <span>{sub.products_count || 0} items</span>
                          <ExternalLink size={11} />
                        </button>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => openEditSubcategory(sub, e)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Edit subcategory"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={(e) => openDeleteSubcategory(sub, e)}
                            className="rounded-md p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Delete subcategory"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-12 text-center">
                <Layers size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-medium text-slate-600">No subcategories found</p>
                <p className="text-xs text-slate-400 mt-0.5">Click "Add Subcategory" to create one</p>
                <button
                  onClick={() => openAddSubcategory(selectedCatId !== 'ALL' ? selectedCatId : null)}
                  className="mt-3 inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  <Plus size={13} />
                  <span>Create Subcategory</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL: Add / Edit Category ── */}
      {(modalType === 'addCat' || modalType === 'editCat') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                {modalType === 'editCat' ? 'Edit Category' : 'New Category'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Category Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. IT Equipment"
                  value={catNameInput}
                  onChange={(e) => setCatNameInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !catNameInput.trim()}
                  className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (modalType === 'editCat' ? 'Save Changes' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Add / Edit Subcategory ── */}
      {(modalType === 'addSub' || modalType === 'editSub') && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                {modalType === 'editSub' ? 'Edit Subcategory' : 'New Subcategory'}
              </h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSubcategory} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Parent Category</label>
                <select
                  required
                  value={subFormInput.category_id}
                  onChange={(e) => setSubFormInput({ ...subFormInput, category_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-slate-800"
                >
                  <option value="">Select category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Subcategory Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Laptops"
                  value={subFormInput.name}
                  onChange={(e) => setSubFormInput({ ...subFormInput, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !subFormInput.name.trim() || !subFormInput.category_id}
                  className="rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (modalType === 'editSub' ? 'Save Changes' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Category Confirmation ── */}
      {modalType === 'deleteCat' && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="font-bold text-slate-900">Delete Category</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to delete category <span className="font-semibold text-rose-600">"{activeItem.name}"</span>? Any subcategories underneath will also be deleted.
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteCategory}
                className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Delete Subcategory Confirmation ── */}
      {modalType === 'deleteSub' && activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="font-bold text-slate-900">Delete Subcategory</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to delete subcategory <span className="font-semibold text-rose-600">"{activeItem.name}"</span>?
            </p>
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDeleteSubcategory}
                className="rounded-xl bg-rose-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
