import { useState, useEffect, useRef } from 'react';
import { Download, X } from 'lucide-react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { getApiBase, apiFetch, subscribeDataSync } from '../api';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [showAdd, setShowAdd] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const barcodeRef = useRef();
  const qrRef = useRef();

  const [form, setForm] = useState({
    name: '', sku: '', subcategory_id: '', current_stock: 0, min_stock_level: 5
  });

  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    const apiBase = getApiBase();
    try {
      const [pRes, sRes] = await Promise.all([
        apiFetch(`${apiBase}/index.php?action=products`),
        apiFetch(`${apiBase}/index.php?action=subcategories`)
      ]);
      setProducts(pRes.ok ? await pRes.json() : []);
      setSubs(sRes.ok ? await sRes.json() : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const unsubscribe = subscribeDataSync(() => fetchData(true), 3500);
    return () => unsubscribe();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const apiBase = getApiBase();
    await apiFetch(`${apiBase}/index.php?action=products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setShowAdd(false);
    setForm({ name: '', sku: '', subcategory_id: '', current_stock: 0, min_stock_level: 5 });
    fetchData();
  };

  const downloadBarcode = () => {
    if (!barcodeRef.current) return;
    const svg = barcodeRef.current.querySelector('svg');
    if (!svg) return;
    
    // Convert SVG to canvas to download as PNG
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));
    img.onload = function() {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `Barcode-${selectedProduct.sku}.png`;
        link.href = url;
        link.click();
    };
  };

  const downloadQR = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;
    
    // Convert SVG to canvas to download as PNG
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.setAttribute("src", "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));
    img.onload = function() {
        // add padding for QR code PNG
        const padding = 20;
        canvas.width = img.width + padding * 2;
        canvas.height = img.height + padding * 2;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, padding, padding);
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `QR-${selectedProduct.sku}.png`;
        link.href = url;
        link.click();
    };
  };

  const filtered = products.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Products</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your warehouse inventory items</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary w-full sm:w-auto justify-center">
          <span className="material-symbols-outlined text-lg">add</span>
          Add Product
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative w-full sm:max-w-md">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-tertiary text-xl">search</span>
        <input 
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search by name or SKU..."
          className="input-field input-with-icon"
        />
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger">
        {filtered.map(p => {
          const isLowStock = Number(p.current_stock) <= Number(p.min_stock_level);
          return (
            <div 
              key={p.id} 
              onClick={() => setSelectedProduct(p)}
              className="card p-5 cursor-pointer hover:border-primary/30 group animate-fade-in relative overflow-hidden"
            >
              {isLowStock && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-danger to-orange-400" />}
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-4 min-w-0">
                  <div className="font-semibold text-text-primary text-base group-hover:text-primary transition-colors truncate">{p.name}</div>
                  <div className="text-xs text-text-tertiary font-mono mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">tag</span>
                    {p.sku}
                  </div>
                </div>
                <div className="p-1.5 bg-surface-raised rounded-lg border border-border flex-shrink-0 flex items-center justify-center max-w-[100px]">
                  <Barcode value={p.barcode || p.sku} width={1} height={30} displayValue={false} margin={0} />
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-border-light">
                <span className="badge badge-neutral text-xs">
                  {p.subcategory_name || 'General'}
                </span>
                <span className={`badge ${isLowStock ? 'badge-danger' : 'badge-success'}`}>
                  {isLowStock && <span className="material-symbols-outlined text-xs">warning</span>}
                  {p.current_stock} in stock
                </span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && !loading && (
          <div className="col-span-full p-16 text-center card">
            <span className="material-symbols-outlined text-5xl text-border mb-3 block">inventory_2</span>
            <p className="text-text-secondary font-medium">{searchTerm ? 'No products match your search' : 'No products found'}</p>
            <p className="text-text-tertiary text-sm mt-1">Click "Add Product" to get started</p>
          </div>
        )}
      </div>

      {/* ── View Product Modal ── */}
      {selectedProduct && (
        <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
          <div className="modal-content max-w-sm" onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <div className="absolute top-4 right-4 z-10">
              <button onClick={() => setSelectedProduct(null)} className="p-1.5 bg-white/80 hover:bg-surface-raised rounded-full text-text-secondary transition-colors backdrop-blur-sm border border-border">
                <X size={16} />
              </button>
            </div>
            
            {/* Barcode Section */}
            <div className="bg-gradient-to-b from-surface-raised to-white p-6 flex flex-col items-center rounded-t-2xl relative">
              
              {/* Barcode */}
              <div className="w-full flex flex-col items-center mb-2">
                <span className="text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-2">Item 1D Barcode</span>
                <div ref={barcodeRef} className="p-3 bg-white rounded-xl shadow-sm border border-border overflow-hidden w-full flex justify-center">
                  <Barcode value={selectedProduct.barcode || selectedProduct.sku} width={1.8} height={50} displayValue={true} margin={0} />
                </div>
              </div>

              <h2 className="text-lg font-bold text-text-primary text-center leading-tight mt-3">{selectedProduct.name}</h2>
              <span className="badge badge-neutral mt-2 font-mono">{selectedProduct.sku}</span>
            </div>
            
            {/* Details */}
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-border-light">
                <span className="text-sm text-text-secondary">Category</span>
                <span className="text-sm font-semibold text-text-primary">{selectedProduct.subcategory_name || 'General'}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-border-light">
                <span className="text-sm text-text-secondary">Current Stock</span>
                <span className={`text-sm font-bold ${Number(selectedProduct.current_stock) <= Number(selectedProduct.min_stock_level) ? 'text-danger' : 'text-success'}`}>
                  {selectedProduct.current_stock}
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-text-secondary">Min Level</span>
                <span className="text-sm font-semibold text-text-primary">{selectedProduct.min_stock_level}</span>
              </div>
              
              <div className="mt-4">
                <button 
                  onClick={downloadBarcode}
                  className="btn-primary w-full justify-center text-xs px-2 py-2.5"
                >
                  <Download size={14} />
                  Download Product Barcode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Product Modal ── */}
      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal-content max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-text-primary mb-1">Add Product</h2>
            <p className="text-sm text-text-tertiary mb-5">Create a new inventory item</p>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Product Name</label>
                <input type="text" placeholder="e.g. Wireless Scanner" className="input-field" required onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">SKU / Barcode</label>
                <input type="text" placeholder="e.g. SKU-1001" className="input-field" required onChange={e => setForm({...form, sku: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Category</label>
                <select className="input-field" onChange={e => setForm({...form, subcategory_id: e.target.value})}>
                  <option value="">General / Uncategorized</option>
                  {subs.map(s => <option key={s.id} value={s.id}>{s.name} ({s.category_name})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Initial Stock</label>
                  <input type="number" min="0" placeholder="0" className="input-field" onChange={e => setForm({...form, current_stock: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Min Alert Level</label>
                  <input type="number" min="1" defaultValue="5" className="input-field" onChange={e => setForm({...form, min_stock_level: e.target.value})} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button type="button" onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary">Save Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
