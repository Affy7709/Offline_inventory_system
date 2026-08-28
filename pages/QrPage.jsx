import { useState, useEffect, useRef } from 'react'
import { Camera, Search, ScanLine, X, ArrowUpRight, ArrowDownLeft, UserCheck, ShieldCheck, LogIn } from 'lucide-react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { getApiBase, apiFetch, safeJson, setAuthToken } from '../api'
import { useNavigate } from 'react-router-dom'

export default function QrPage() {
  const [sku, setSku] = useState('')
  const [product, setProduct] = useState(null)
  const [scannedUser, setScannedUser] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showCamera, setShowCamera] = useState(false)
  const scannerRef = useRef(null)
  const navigate = useNavigate()

  // Transaction form states
  const [activeTab, setActiveTab] = useState('issue') // 'issue' | 'return'
  const [txQty, setTxQty] = useState(1)
  
  // Issue states
  const [issuedTo, setIssuedTo] = useState('')
  const [purpose, setPurpose] = useState('')

  // Return states
  const [condition, setCondition] = useState('Good Condition')
  const [returnNotes, setReturnNotes] = useState('')

  const [txLoading, setTxLoading] = useState(false)
  const [txSuccess, setTxSuccess] = useState('')
  const [txError, setTxError] = useState('')

  const base = getApiBase()

  useEffect(() => {
    let scanner = null
    if (showCamera) {
      scanner = new Html5QrcodeScanner(
        'barcode-viewfinder',
        { 
          fps: 15, 
          qrbox: { width: 280, height: 170 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          rememberLastUsedCamera: true
        },
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
    const code = searchCode.trim()
    if (!code) return
    setError('')
    setProduct(null)
    setScannedUser(null)
    setLoading(true)
    setTxSuccess('')
    setTxError('')
    setTxQty(1)
    setIssuedTo('')
    setPurpose('')
    setReturnNotes('')
    setCondition('Good Condition')

    // Check if scanned code is a User Barcode (e.g. ADM-101, EMP-101)
    if (code.toUpperCase().startsWith('ADM-') || code.toUpperCase().startsWith('EMP-') || code.toUpperCase().startsWith('USR-') || code.toLowerCase() === 'admin') {
      try {
        const uRes = await apiFetch(`${base}/index.php?action=barcode_login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode: code })
        })
        const uData = await safeJson(uRes)
        if (uRes.ok && uData.success) {
          setScannedUser(uData)
          setLoading(false)
          return
        }
      } catch (err) {
        console.warn('Barcode user lookup check skipped:', err)
      }
    }

    // Otherwise lookup product by barcode
    try {
      const res = await apiFetch(`${base}/index.php?action=product_by_barcode&barcode=${encodeURIComponent(code)}`)
      const data = await safeJson(res)
      if (res.ok && data) {
        setProduct(data)
      } else {
        setError(data.error || 'No item found matching this Barcode')
      }
    } catch (err) {
      console.error(err)
      setError('Connection error — check backend server IP')
    } finally {
      setLoading(false)
    }
  }

  const handleBarcodeUserLogin = (userPayload) => {
    if (!userPayload) return
    localStorage.setItem('user', JSON.stringify(userPayload.user))
    setAuthToken(userPayload.token)
    setTxSuccess(`Logged in as ${userPayload.user.username} (${userPayload.user.role_name || 'User'})!`)
    setTimeout(() => {
      navigate('/')
    }, 1000)
  }

  const handleIssueSubmit = async (e) => {
    e.preventDefault()
    if (!product || !product.id) {
      setTxError('No valid product selected')
      return
    }
    if (!issuedTo.trim()) {
      setTxError('Issued To is a mandatory field')
      return
    }
    setTxLoading(true)
    setTxSuccess('')
    setTxError('')

    const compiledNotes = `Issued To: ${issuedTo.trim()}${purpose.trim() ? ` | Purpose: ${purpose.trim()}` : ''}`
    const validQty = Math.max(1, parseInt(txQty, 10) || 1)

    try {
      const res = await apiFetch(`${base}/index.php?action=transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(product.id),
          type: 'issue',
          quantity: validQty,
          notes: compiledNotes
        })
      })
      const data = await safeJson(res)
      if (res.ok && data.success) {
        setTxSuccess(`Successfully issued ${validQty} unit(s) to ${issuedTo.trim()}!`)
        setProduct(prev => ({ ...prev, current_stock: data.new_stock }))
        setIssuedTo('')
        setPurpose('')
      } else {
        setTxError(data.error || 'Transaction failed')
      }
    } catch (err) {
      console.error('Issue transaction error:', err)
      setTxError(err?.message || 'Network error: Cannot connect to server')
    } finally {
      setTxLoading(false)
    }
  }

  const handleReturnSubmit = async (e) => {
    e.preventDefault()
    if (!product || !product.id) {
      setTxError('No valid product selected')
      return
    }
    setTxLoading(true)
    setTxSuccess('')
    setTxError('')

    const compiledNotes = `Condition: ${condition}${returnNotes.trim() ? ` | Notes: ${returnNotes.trim()}` : ''}`
    const validQty = Math.max(1, parseInt(txQty, 10) || 1)

    try {
      const res = await apiFetch(`${base}/index.php?action=transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(product.id),
          type: 'return',
          quantity: validQty,
          notes: compiledNotes
        })
      })
      const data = await safeJson(res)
      if (res.ok && data.success) {
        setTxSuccess(`Successfully returned ${validQty} unit(s)!`)
        setProduct(prev => ({ ...prev, current_stock: data.new_stock }))
        setReturnNotes('')
      } else {
        setTxError(data.error || 'Transaction failed')
      }
    } catch (err) {
      console.error('Return transaction error:', err)
      setTxError(err?.message || 'Network error: Cannot connect to server')
    } finally {
      setTxLoading(false)
    }
  }

  return (
    <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[1.1fr_0.9fr] font-sans">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Field Ops & Scanner</p>
            <h2 className="text-2xl font-semibold text-slate-900">Barcode Verification Terminal</h2>
          </div>
        </div>

        {/* Viewfinder area */}
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 sm:p-6">
          {showCamera ? (
            <div className="relative overflow-hidden rounded-2xl bg-slate-950 border border-slate-700 shadow-xl">
              <button 
                onClick={() => {
                  if (scannerRef.current) {
                    scannerRef.current.clear().catch(console.error)
                    scannerRef.current = null
                  }
                  setShowCamera(false)
                }}
                className="absolute top-3 right-3 z-30 rounded-xl bg-slate-900/80 p-2 text-white hover:bg-slate-900 transition backdrop-blur-sm shadow-md"
                title="Close Camera"
              >
                <X size={18} />
              </button>

              <div id="barcode-viewfinder" className="rounded-2xl overflow-hidden min-h-[300px]" />

              {/* Simple Rectangle Guide */}
              <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
                <div className="w-64 h-40 sm:w-72 sm:h-44 rounded-xl border-2 border-emerald-400 bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
              </div>
            </div>
          ) : (
            <div className="mx-auto flex h-72 max-w-md flex-col items-center justify-center rounded-2xl border-2 border-slate-300 bg-white shadow-inner gap-3 text-slate-600">
              <Camera size={42} className="text-slate-400" />
              <span className="text-sm font-medium">Barcode Scanner Camera Viewfinder</span>
              <button 
                onClick={() => setShowCamera(true)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-sm"
              >
                Open Camera Scanner
              </button>
            </div>
          )}
        </div>

        {/* Manual search */}
        <form onSubmit={(e) => { e.preventDefault(); handleLookup(); }} className="mt-5 flex flex-col gap-3 md:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
            <ScanLine size={16} className="text-emerald-600" />
            <input 
              className="w-full bg-transparent outline-none text-slate-900 font-mono text-xs" 
              placeholder="Scan or type Barcode (Product or User ID e.g. ADM-101)…" 
              value={sku}
              onChange={e => setSku(e.target.value)}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            {loading ? 'Scanning…' : 'Lookup Barcode'}
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
          <h3 className="text-lg font-semibold">Scan Result</h3>
        </div>

        {/* 1. SCANNED USER CARD */}
        {scannedUser ? (
          <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-600 text-white">
                  <UserCheck size={24} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">User Identified via Barcode</span>
                  <h4 className="text-xl font-bold text-slate-900">{scannedUser.user.username}</h4>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">
                {scannedUser.user.role_name || 'Staff'}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600 border-t border-emerald-200/80 pt-3">
              <div className="flex justify-between">
                <span>Department</span>
                <span className="font-semibold text-slate-800">{scannedUser.user.dept_name || 'Operations'}</span>
              </div>
              <div className="flex justify-between">
                <span>User Barcode</span>
                <span className="font-mono font-bold text-slate-900">{scannedUser.user.barcode || sku}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleBarcodeUserLogin(scannedUser)}
              className="w-full mt-2 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-sm"
            >
              <LogIn size={16} />
              <span>Log In as {scannedUser.user.username}</span>
            </button>
          </div>
        ) : product ? (
          /* 2. SCANNED PRODUCT CARD */
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Barcode / SKU</p>
                <h4 className="mt-1 text-xl font-semibold text-slate-900 font-mono">{product.barcode || product.sku}</h4>
              </div>
              <div className="rounded-xl bg-slate-900 p-3 text-white">
                <ScanLine size={20} />
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
                <span>Barcode ID</span>
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

            {/* Quick Stock Action Section */}
            <div className="border-t border-slate-200 pt-4 mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Stock Update</h5>
                
                {/* Tab Switcher */}
                <div className="flex p-0.5 bg-slate-200/80 rounded-xl">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('issue'); setTxError(''); setTxSuccess(''); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${activeTab === 'issue' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Issue Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('return'); setTxError(''); setTxSuccess(''); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${activeTab === 'return' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Return Stock
                  </button>
                </div>
              </div>

              {activeTab === 'issue' ? (
                <form onSubmit={handleIssueSubmit} className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Quantity *</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={txQty}
                        onChange={e => setTxQty(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900 bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Issued To *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. John Doe / Ops Team"
                        value={issuedTo}
                        onChange={e => setIssuedTo(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-900 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Purpose (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Site Inspection / Workstation setup"
                      value={purpose}
                      onChange={e => setPurpose(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-900 bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={txLoading || Number(product.current_stock) < (parseInt(txQty, 10) || 1)}
                    className="w-full rounded-xl bg-amber-600 py-2.5 text-xs font-semibold text-white hover:bg-amber-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ArrowUpRight size={14} />
                    Confirm Issue ({(parseInt(txQty, 10) || 1)} {(parseInt(txQty, 10) || 1) === 1 ? 'unit' : 'units'})
                  </button>
                </form>
              ) : (
                <form onSubmit={handleReturnSubmit} className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Quantity *</label>
                      <input 
                        type="number" 
                        min="1" 
                        value={txQty}
                        onChange={e => setTxQty(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-900 outline-none focus:border-slate-900 bg-white"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Condition</label>
                      <select
                        value={condition}
                        onChange={e => setCondition(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-900 bg-white"
                      >
                        <option value="Good Condition">Good Condition</option>
                        <option value="Minor Wear">Minor Wear</option>
                        <option value="Needs Repair">Needs Repair</option>
                        <option value="Damaged">Damaged</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Notes (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Returned after project completion"
                      value={returnNotes}
                      onChange={e => setReturnNotes(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-slate-900 bg-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={txLoading}
                    className="w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <ArrowDownLeft size={14} />
                    Confirm Return ({(parseInt(txQty, 10) || 1)} {(parseInt(txQty, 10) || 1) === 1 ? 'unit' : 'units'})
                  </button>
                </form>
              )}

              {txSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                  ✓ {txSuccess}
                </div>
              )}
              {txError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  ⚠ {txError}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-center">
            <ScanLine size={48} className="text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-500">No Barcode scanned yet</p>
            <p className="text-xs text-slate-400 mt-1">Scan a Product Barcode or User Barcode badge to view details</p>
          </div>
        )}
      </div>
    </div>
  )
}
