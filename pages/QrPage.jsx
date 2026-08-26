import { useState, useEffect, useRef } from 'react'
import { Camera, Search, QrCode, Download, Printer, X } from 'lucide-react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { getApiBase, apiFetch } from '../api'

export default function QrPage() {
  const [sku, setSku] = useState('')
  const [product, setProduct] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const scannerRef = useRef(null)

  const base = getApiBase()

  useEffect(() => {
    let scanner = null
    if (showCamera) {
      scanner = new Html5QrcodeScanner(
        'qr-viewfinder',
        { fps: 10, qrbox: { width: 250, height: 250 }, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
        false
      )
      scannerRef.current = scanner
      scanner.render(
        (decodedText) => {
          setSku(decodedText)
          handleLookup(decodedText)
          scanner.clear().catch(console.error)
          scannerRef.current = null
          setShowCamera(false)
        },
        () => {}
      )
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
        scannerRef.current = null
      }
    }
  }, [showCamera])

  const handleLookup = async (searchCode = sku) => {
    if (!searchCode.trim()) return
    setError('')
    setProduct(null)
    setLoading(true)

    try {
      const res = await apiFetch(`${base}/index.php?action=product_by_barcode&barcode=${encodeURIComponent(searchCode.trim())}`)
      const data = await res.json()
      if (res.ok && data) {
        setProduct(data)
      } else {
        setError(data.error || 'Product not found for this SKU / Barcode')
      }
    } catch {
      setError('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[1.1fr_0.9fr] font-sans">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Field Ops</p>
            <h2 className="text-2xl font-semibold text-slate-900">QR / Barcode scanner</h2>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Download size={18} /></button>
            <button className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"><Printer size={18} /></button>
          </div>
        </div>

        {/* Viewfinder area */}
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
          {showCamera ? (
            <div className="relative">
              <button 
                onClick={() => {
                  if (scannerRef.current) {
                    scannerRef.current.clear().catch(console.error)
                    scannerRef.current = null
                  }
                  setShowCamera(false)
                }}
                className="absolute top-2 right-2 z-10 rounded-lg bg-slate-900/70 p-1.5 text-white hover:bg-slate-900"
              >
                <X size={16} />
              </button>
              <div id="qr-viewfinder" className="rounded-2xl overflow-hidden bg-white" />
            </div>
          ) : (
            <div className="mx-auto flex h-72 max-w-md flex-col items-center justify-center rounded-2xl border-2 border-slate-300 bg-white shadow-inner gap-3 text-slate-600">
              <Camera size={42} className="text-slate-400" />
              <span className="text-sm font-medium">Tablet scanner viewfinder</span>
              <button 
                onClick={() => setShowCamera(true)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Open Camera Scanner
              </button>
            </div>
          )}
        </div>

        {/* Manual search */}
        <form onSubmit={(e) => { e.preventDefault(); handleLookup(); }} className="mt-5 flex flex-col gap-3 md:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
            <QrCode size={16} />
            <input 
              className="w-full bg-transparent outline-none text-slate-900 font-mono text-xs" 
              placeholder="Scan or type SKU / Barcode manually…" 
              value={sku}
              onChange={e => setSku(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Lookup item'}
          </button>
        </form>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            ⚠ {error}
          </div>
        )}
      </div>

      {/* Lookup Result */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-slate-700">
          <Search size={18} />
          <h3 className="text-lg font-semibold">Lookup result</h3>
        </div>

        {product ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">SKU / Barcode</p>
                <h4 className="mt-1 text-xl font-semibold text-slate-900 font-mono">{product.sku}</h4>
              </div>
              <div className="rounded-xl bg-slate-900 p-3 text-white">
                <QrCode size={20} />
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-600 border-t border-slate-200 pt-4">
              <div className="flex justify-between">
                <span>Product Name</span>
                <span className="font-semibold text-slate-900">{product.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Category</span>
                <span className="font-semibold text-slate-800">{product.subcategory_name || 'General'}</span>
              </div>
              <div className="flex justify-between">
                <span>Barcode</span>
                <span className="font-mono text-slate-800">{product.barcode || product.sku}</span>
              </div>
              <div className="flex justify-between">
                <span>Stock Status</span>
                <span className={`font-semibold ${Number(product.current_stock) <= Number(product.min_stock_level) ? 'text-rose-600' : 'text-emerald-600'}`}>
                  {Number(product.current_stock) <= 0 ? 'Out of Stock' : Number(product.current_stock) <= Number(product.min_stock_level) ? 'Low Stock' : 'In Stock'}
                </span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900">
                <span>Available Quantity</span>
                <span className="text-lg">{product.current_stock} units</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
            <QrCode size={48} className="text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-500">No asset scanned yet</p>
            <p className="text-xs text-slate-400 mt-1">Scan a QR code or enter SKU to view live stock details</p>
          </div>
        )}
      </div>
    </div>
  )
}
