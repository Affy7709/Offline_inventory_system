import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import { getApiBase, apiFetch } from '../api';

export default function QrPage() {
  const [sku, setSku]             = useState('');
  const [product, setProduct]     = useState(null);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const scannerRef = useRef(null);
  const base = getApiBase();

  // ── Camera scanner lifecycle ───────────────────────────────
  useEffect(() => {
    let scanner = null;
    if (showCamera) {
      scanner = new Html5QrcodeScanner(
        'qr-page-reader',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        },
        false
      );
      scannerRef.current = scanner;
      scanner.render(
        (decodedText) => {
          setSku(decodedText);
          handleSearch(decodedText);
          scanner.clear().catch(console.error);
          scannerRef.current = null;
          setShowCamera(false);
        },
        () => {}
      );
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [showCamera]);

  const closeCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setShowCamera(false);
  };

  // ── Product lookup ─────────────────────────────────────────
  const handleSearch = async (searchSku = sku) => {
    if (!searchSku.trim()) return;
    setError(''); setProduct(null); setLoading(true);
    try {
      const res = await apiFetch(
        `${base}/index.php?action=product_by_barcode&barcode=${encodeURIComponent(searchSku)}`
      );
      const data = await res.json();
      if (res.ok) setProduct(data);
      else setError(data.error || 'Product not found');
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-text-tertiary">Field Ops</p>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">QR / Barcode Scanner</h1>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        {/* ── Scanner Panel ── */}
        <div className="card p-6 space-y-4">
          {showCamera ? (
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">photo_camera</span>
                  Camera Scanner
                </h3>
                <button
                  onClick={closeCamera}
                  className="p-1.5 hover:bg-surface-raised rounded-full text-text-secondary transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
              <div
                id="qr-page-reader"
                className="w-full overflow-hidden rounded-xl border border-border bg-white p-2"
              />
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-border bg-surface flex flex-col items-center justify-center py-14 gap-3 text-text-tertiary">
              <div className="relative">
                <div className="absolute inset-0 rounded-full border-2 border-primary opacity-20 animate-ping" />
                <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center">
                  <span className="material-symbols-outlined text-3xl text-primary">photo_camera</span>
                </div>
              </div>
              <p className="text-sm font-medium text-text-secondary">Tablet scanner viewfinder</p>
              <button onClick={() => setShowCamera(true)} className="btn-primary mt-2">
                <span className="material-symbols-outlined">photo_camera</span>
                Open Camera
              </button>
            </div>
          )}

          {/* Manual lookup bar */}
          <form onSubmit={e => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
            <div className="flex-1 relative">
              <span
                className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-tertiary"
                style={{ fontSize: '18px' }}
              >
                qr_code
              </span>
              <input
                type="text"
                className="input-field input-with-icon font-mono"
                placeholder="Scan or type code manually"
                value={sku}
                onChange={e => setSku(e.target.value)}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary px-5">
              {loading
                ? <span className="material-symbols-outlined animate-spin">progress_activity</span>
                : 'Lookup'
              }
            </button>
          </form>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-danger-bg text-sm text-danger-text font-medium">
              <span className="material-symbols-outlined text-lg flex-shrink-0">error</span>
              {error}
            </div>
          )}
        </div>

        {/* ── Lookup Result ── */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="material-symbols-outlined text-text-tertiary">manage_search</span>
            <h3 className="text-lg font-bold text-text-primary">Lookup Result</h3>
          </div>

          {product ? (
            <div className="rounded-xl bg-surface border border-border p-5 space-y-4 animate-slide-up">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-text-tertiary tracking-wider">SKU</p>
                  <h4 className="text-xl font-bold text-text-primary font-mono mt-1">{product.sku}</h4>
                </div>
                <div className="rounded-xl bg-primary p-3 text-white">
                  <span className="material-symbols-outlined">qr_code</span>
                </div>
              </div>

              <div className="space-y-2.5 text-sm text-text-secondary">
                <div className="flex justify-between border-b border-border pb-2">
                  <span>Product</span>
                  <span className="font-semibold text-text-primary">{product.name}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>Category</span>
                  <span className="font-semibold text-text-primary">{product.subcategory_name || '—'}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span>Status</span>
                  <span className={`font-semibold ${Number(product.current_stock) <= Number(product.min_stock_level) ? 'text-danger' : 'text-success'}`}>
                    {Number(product.current_stock) === 0
                      ? 'Out of Stock'
                      : Number(product.current_stock) <= Number(product.min_stock_level)
                        ? 'Low Stock'
                        : 'In Stock'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Quantity</span>
                  <span className="font-bold text-text-primary">{product.current_stock} units</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-text-tertiary">
              <span className="material-symbols-outlined text-5xl text-border mb-3">qr_code_scanner</span>
              <p className="text-sm font-medium">Scan or enter a SKU / barcode</p>
              <p className="text-xs mt-1">Product details will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
