import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { getApiBase, apiFetch, subscribeDataSync } from '../api';
import { useAlert } from '../components/ui/AlertContext';

export default function Scanner() {
  const { toast, showAlert } = useAlert();
  const [sku, setSku] = useState('');
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [actionType, setActionType] = useState('issue');
  const [quantity, setQuantity] = useState(1);
  const [issuedTo, setIssuedTo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [deptsList, setDeptsList] = useState([]);
  const scannerRef = useRef(null);

  const startCamera = () => {
    setShowCamera(true);
    setError('');
  };

  useEffect(() => {
    const apiBase = getApiBase();
    apiFetch(`${apiBase}/index.php?action=users`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setUsersList(d); })
      .catch(() => {});
    apiFetch(`${apiBase}/index.php?action=departments`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setDeptsList(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let scanner = null;
    let isScanning = false;
    
    if (showCamera) {
      scanner = new Html5QrcodeScanner(
        "reader", 
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        },
        /* verbose= */ false
      );
      
      scanner.render(
        (decodedText) => {
          if (isScanning) return;
          isScanning = true;
          
          setSku(decodedText);
          setShowCamera(false);
          if (scanner) {
            scanner.clear().catch(e => console.error(e));
          }
          fetchProduct(decodedText);
        },
        (errorMessage) => {
          // ignore common scan frame misses
        }
      );
      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear html5QrcodeScanner. ", error);
        });
      }
    };
  }, [showCamera]);

  useEffect(() => {
    const unsubscribe = subscribeDataSync(() => {
      if (product && product.sku) {
        // Only fetch on cross-tab/focus events, avoid aggressive interval polling
        fetchProduct(product.sku);
      }
    }, 0);
    return () => unsubscribe();
  }, [product]);

  const fetchProduct = async (searchSku) => {
    setError('');
    const apiBase = getApiBase();
    try {
      const res = await apiFetch(`${apiBase}/index.php?action=scan&barcode=${encodeURIComponent(searchSku)}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data);
        if (data.active_holders && data.active_holders.length === 1) {
          setIssuedTo(data.active_holders[0].person);
        } else {
          setIssuedTo('');
        }
      } else {
        const err = await res.json();
        setError(err.error || 'Product not found');
        setProduct(null);
      }
    } catch (e) {
      setError('Failed to query product');
      setProduct(null);
    }
  };

  const handleSearch = () => {
    if (!sku.trim()) return;
    fetchProduct(sku.trim());
  };

  const handleTransaction = async () => {
    if (!product) return;
    if (actionType === 'issue' && quantity > product.current_stock) {
      setError(`Cannot issue more than available stock (${product.current_stock})`);
      return;
    }
    if (actionType === 'issue' && !issuedTo.trim()) {
      setError('Please specify the person or department to issue this item to');
      return;
    }
    if (actionType === 'return') {
      const holders = product.active_holders || [];
      if (holders.length === 0) {
        const msg = 'Cannot return item: this product has no active issued units.';
        setError(msg);
        toast(msg, 'error');
        return;
      }
      if (!issuedTo.trim()) {
        const msg = 'Returned By is a compulsory field. Please select who is returning the item.';
        setError(msg);
        toast(msg, 'error');
        return;
      }
      const matched = holders.find(h => h.person.toLowerCase() === issuedTo.trim().toLowerCase());
      if (!matched) {
        const msg = `Cannot return item from '${issuedTo}'. They do not hold any issued units.`;
        setError(msg);
        toast(msg, 'error');
        return;
      }
      const returnQty = Number(quantity || 1);
      if (returnQty > matched.qty_held) {
        const msg = `Cannot return ${returnQty} unit(s). ${matched.person} only holds ${matched.qty_held} issued unit(s).`;
        setError(msg);
        toast(msg, 'error');
        return;
      }
      const authQty = Number(product.auth_qty || product.current_stock || 0);
      const currentStock = Number(product.current_stock || 0);
      if (authQty > 0 && (currentStock + returnQty) > authQty) {
        const maxReturnable = Math.max(0, authQty - currentStock);
        const msg = `Cannot return ${returnQty} unit(s). Stock after return (${currentStock + returnQty}) would exceed Authorized Qty (${authQty}). Max returnable: ${maxReturnable}.`;
        setError(msg);
        toast(msg, 'error');
        return;
      }
    }

    setLoading(true);
    const apiBase = getApiBase();

    const compiledNotes = actionType === 'issue'
      ? `Issued To: ${issuedTo.trim()}${notes.trim() ? ` | ${notes.trim()}` : ''}`
      : `Returned By: ${issuedTo.trim() || product.issued_to || 'Staff'}${notes.trim() ? ` | ${notes.trim()}` : ''}`;

    try {
      const res = await apiFetch(`${apiBase}/index.php?action=transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          type: actionType,
          quantity: Number(quantity),
          issued_to: issuedTo.trim(),
          notes: compiledNotes
        })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        const actionLabel = actionType === 'issue' ? 'Stock Issue' : 'Stock Return';
        const targetPerson = issuedTo.trim() || product.issued_to || 'Assignee';
        toast(`${actionLabel} successful for ${product.name} (${quantity} units to/from ${targetPerson})`, 'success');
        setProduct(null);
        setSku('');
        setQuantity(1);
        setIssuedTo('');
        setNotes('');
      } else {
        setError(data.error || 'Transaction failed');
        toast(data.error || 'Transaction failed', 'error');
      }
    } catch (e) {
      setError('Connection error');
      toast('Connection error while processing transaction', 'error');
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
          </div>
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
              {product.active_holders && product.active_holders.length > 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1.5">
                  <div className="text-amber-800 font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-amber-700">assignment_ind</span>
                    <span>Currently Issued To ({product.active_holders.length} {product.active_holders.length === 1 ? 'person' : 'people'}):</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {product.active_holders.map(h => (
                      <span key={h.person} className="bg-amber-100/90 border border-amber-300 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px]">
                        👤 {h.person}: <span className="text-amber-950 font-black">{h.qty_held} {h.qty_held === 1 ? 'unit' : 'units'}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                actionType === 'return' && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-600 text-base">block</span>
                    <span><strong>Cannot Return:</strong> This product has no active issued units. Only items that are currently issued can be returned.</span>
                  </div>
                )
              )}

              {actionType === 'return' && product.active_holders && product.active_holders.length > 0 && (
                <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs flex items-center justify-between text-blue-800">
                  <span>Authorized Quota: <strong>{product.auth_qty || product.current_stock}</strong> | Current In Stock: <strong>{product.current_stock}</strong></span>
                  {(() => {
                    const matched = product.active_holders?.find(h => h.person.toLowerCase() === issuedTo.trim().toLowerCase());
                    return matched ? (
                      <span className="font-bold text-blue-900 bg-blue-100 px-2 py-0.5 rounded">
                        Max Returnable ({matched.person}): {matched.qty_held} units
                      </span>
                    ) : (
                      <span className="font-medium text-blue-700">Select returner below</span>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  {actionType === 'issue' ? 'Issue To / Assignee (Person or Dept) *' : 'Returned By (Select Who Is Returning) *'}
                </label>
                {actionType === 'issue' ? (
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. John Doe (IT Dept)"
                    value={issuedTo} 
                    onChange={e => setIssuedTo(e.target.value)} 
                    className="input-field py-3 font-semibold" 
                  />
                ) : (
                  <select
                    required
                    disabled={!product.active_holders || product.active_holders.length === 0}
                    value={issuedTo}
                    onChange={e => setIssuedTo(e.target.value)}
                    className="input-field py-3 font-semibold disabled:opacity-50 bg-white"
                  >
                    <option value="">-- Select Who Is Returning (Compulsory) * --</option>
                    {product.active_holders && product.active_holders.map(h => (
                      <option key={h.person} value={h.person}>
                        👤 {h.person} ({h.qty_held} {h.qty_held === 1 ? 'unit' : 'units'} held)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Quantity</label>
                <div className="relative">
                  {(() => {
                    const matched = actionType === 'return' ? product.active_holders?.find(h => h.person.toLowerCase() === issuedTo.trim().toLowerCase()) : null;
                    const maxBound = actionType === 'issue' 
                      ? product.current_stock 
                      : (matched ? matched.qty_held : 1);
                    return (
                      <>
                        <input 
                          type="number" 
                          min="1" 
                          max={maxBound}
                          value={quantity} 
                          onChange={e => setQuantity(e.target.value)} 
                          disabled={actionType === 'return' && (!product.active_holders || product.active_holders.length === 0 || !issuedTo)}
                          className="input-field font-bold text-lg py-3 disabled:opacity-50" 
                        />
                        {actionType === 'issue' && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary font-medium">
                            Max: {product.current_stock}
                          </div>
                        )}
                        {actionType === 'return' && matched && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary font-medium">
                            Max for {matched.person}: {matched.qty_held}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                  {actionType === 'issue' ? 'Purpose / Remarks (Optional)' : 'Return Condition / Notes (Optional)'}
                </label>
                <input 
                  type="text" 
                  placeholder={actionType === 'issue' ? "e.g. Project deployment" : "e.g. Good condition / Completed project"}
                  value={notes} 
                  onChange={e => setNotes(e.target.value)} 
                  disabled={actionType === 'return' && (!product.active_holders || product.active_holders.length === 0)}
                  className="input-field py-3 disabled:opacity-50" 
                />
              </div>

              <div className="pt-4 mt-4 border-t border-border">
                <button 
                  onClick={handleTransaction} 
                  disabled={loading || (actionType === 'return' && (!product.active_holders || product.active_holders.length === 0 || !issuedTo))}
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
