import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { getApiBase, apiFetch } from '../api';

export default function Scanner() {
  const [sku, setSku] = useState('');
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [actionType, setActionType] = useState('issue');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef(null);

  const startCamera = () => {
    setShowCamera(true);
    setError('');
  };

  useEffect(() => {
    let scanner = null;
    if (showCamera) {
      scanner = new Html5QrcodeScanner(
        "reader", 
        { fps: 10, qrbox: {width: 250, height: 250}, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
        false
      );
      scannerRef.current = scanner;
      
      scanner.render(
        (decodedText) => {
          setSku(decodedText);
          handleSearch(decodedText);
          scanner.clear();
          scannerRef.current = null;
          setShowCamera(false);
        },
        (err) => { }
      );
    }
    
    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error(e));
      }
      scannerRef.current = null;
    };
  }, [showCamera]);

  const handleSearch = async (searchSku = sku) => {
    if (!searchSku.trim()) return;
    setError('');
    setProduct(null);
    setLoading(true);

    const apiBase = getApiBase();

    try {
      const res = await apiFetch(`${apiBase}/index.php?action=product_by_barcode&barcode=${searchSku}`);
      const data = await res.json();
      if (res.ok && data) {
        setProduct(data);
      } else {
        setError(data.error || 'Product not found');
      }
    } catch (e) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleTransaction = async () => {
    if (!product || quantity < 1) return;
    
    if (actionType === 'issue' && quantity > product.current_stock) {
      setError('Cannot issue more than available stock');
      return;
    }

    setLoading(true);
    const apiBase = getApiBase();

    try {
      const res = await apiFetch(`${apiBase}/index.php?action=transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          type: actionType,
          quantity: quantity,
          notes: notes
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setProduct(null);
        setSku('');
        setQuantity(1);
        setNotes('');
        alert(`${actionType.toUpperCase()} successful!`);
      } else {
        setError(data.error || 'Transaction failed');
      }
    } catch (e) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Scanner Terminal</h1>
        <p className="text-sm text-text-secondary mt-1">Scan barcodes or enter SKU manually to issue or return items</p>
      </div>

      {/* Search Box */}
      <div className="card p-5">
        <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-tertiary">barcode_scanner</span>
            <input 
              type="text" 
              value={sku} 
              onChange={e => setSku(e.target.value)} 
              placeholder="Scan or type SKU/Barcode..." 
              className="input-field input-with-icon h-full font-mono" 
              autoFocus 
            />
          </div>
          <button type="submit" className="btn-primary py-3 sm:px-8 justify-center">
            Search
          </button>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-danger-bg border border-danger/20 animate-fade-in shadow-sm">
          <span className="material-symbols-outlined text-danger text-lg flex-shrink-0 mt-0.5">error</span>
          <span className="text-sm text-danger-text font-medium">{error}</span>
        </div>
      )}

      {/* Camera Scanner */}
      {showCamera && (
        <div className="card p-4 animate-scale-in">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">photo_camera</span>
              Camera Scanner
            </h3>
            <button 
              onClick={() => {
                if (scannerRef.current) {
                  scannerRef.current.clear().catch(console.error);
                  scannerRef.current = null;
                }
                setShowCamera(false);
              }}
              className="p-1.5 hover:bg-surface-raised rounded-full text-text-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-slate-700 shadow-inner">
            <div id="reader" className="w-full overflow-hidden rounded-xl min-h-[280px]"></div>

            {/* Simple Rectangle Guide */}
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
              <div className="w-64 h-40 sm:w-72 sm:h-44 rounded-xl border-2 border-emerald-400 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
        </div>
      )}

      {/* Idle State */}
      {!product && !showCamera && (
        <div className="card p-12 flex flex-col items-center justify-center text-center border-dashed border-2">
          <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mb-4 text-primary relative">
            <div className="absolute inset-0 rounded-full border-2 border-primary opacity-20 animate-ping"></div>
            <span className="material-symbols-outlined text-3xl">barcode_scanner</span>
          </div>
          <h3 className="text-lg font-bold text-text-primary mb-1">Ready to scan</h3>
          <p className="text-text-secondary text-sm mb-6 max-w-sm">Use your device camera to scan a product's barcode</p>
          <button 
            onClick={startCamera} 
            className="btn-primary px-6 shadow-md shadow-primary/20"
          >
            <span className="material-symbols-outlined">photo_camera</span>
            Open Camera Scanner
          </button>
        </div>
      )}

      {/* Product & Action Form */}
      {product && !showCamera && (
        <div className="card overflow-hidden animate-slide-up">
          {/* Product Header */}
          <div className="p-6 bg-gradient-to-r from-surface to-white border-b border-border">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <h2 className="text-xl font-bold text-text-primary leading-tight mb-2">{product.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="badge badge-neutral font-mono shadow-sm">
                    <span className="material-symbols-outlined text-[14px]">barcode</span>
                    {product.sku}
                  </span>
                  <span className="badge badge-info">
                    {product.subcategory_name || 'General'}
                  </span>
                </div>
              </div>
              <div className="text-left sm:text-right bg-white p-3 rounded-xl border border-border shadow-sm min-w-[120px]">
                <div className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider mb-1">Available Stock</div>
                <div className={`text-3xl font-black ${Number(product.current_stock) <= Number(product.min_stock_level) ? 'text-danger' : 'text-success'}`}>
                  {product.current_stock}
                </div>
              </div>
            </div>
          </div>
          
          {/* Action Tabs */}
          <div className="p-6">
            <div className="grid grid-cols-2 gap-3 mb-6 p-1 bg-surface-raised rounded-xl border border-border">
              <button 
                type="button"
                onClick={() => setActionType('issue')} 
                className={`py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  actionType === 'issue' 
                    ? 'bg-white text-danger shadow-sm border border-border-light' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                ISSUE ITEM
              </button>
              <button 
                type="button"
                onClick={() => setActionType('return')} 
                className={`py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  actionType === 'return' 
                    ? 'bg-white text-success shadow-sm border border-border-light' 
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                RETURN ITEM
              </button>
            </div>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Quantity</label>
                <div className="relative">
                  <input 
                    type="number" 
                    min="1" 
                    max={actionType === 'issue' ? product.current_stock : 9999}
                    value={quantity} 
                    onChange={e => setQuantity(e.target.value)} 
                    className="input-field font-bold text-lg py-3" 
                  />
                  {actionType === 'issue' && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary font-medium">
                      Max: {product.current_stock}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Allocation Notes / Assignee</label>
                <input 
                  type="text" 
                  placeholder="e.g. Assigned to John (IT Dept)"
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  className="input-field py-3" 
                />
              </div>
              <div className="pt-4 mt-4 border-t border-border">
                <button 
                  onClick={handleTransaction} 
                  disabled={loading}
                  className={`w-full py-3.5 rounded-xl font-bold text-white shadow-sm transition-all flex justify-center items-center gap-2 ${
                    actionType === 'issue' ? 'bg-danger hover:bg-red-600' : 'bg-success hover:bg-emerald-600'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading ? (
                    <><span className="material-symbols-outlined animate-spin">progress_activity</span> Processing...</>
                  ) : (
                    <>CONFIRM {actionType.toUpperCase()}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
