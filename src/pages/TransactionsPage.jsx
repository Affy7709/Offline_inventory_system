import { useState, useEffect } from 'react'
import { Badge } from '../components/ui/Badge'
import {
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Camera,
  ShieldCheck,
  Calendar,
  Clock,
  QrCode,
  Package,
  Layers,
} from 'lucide-react'
import { useInventory } from '../context/InventoryContext'
import BarcodeScannerModal from '../components/ui/BarcodeScannerModal'

export default function TransactionsPage() {
  const {
    products,
    transactions,
    issueAsset,
    returnAsset,
    currentUser,
    getSystemDate,
    getSystemTime,
  } = useInventory()

  const [feedback, setFeedback] = useState('')
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerTargetForm, setScannerTargetForm] = useState('ISSUE') // 'ISSUE' | 'RETURN'

  // Live system clock & date
  const [systemTime, setSystemTime] = useState(getSystemTime())
  const [systemDate, setSystemDate] = useState(getSystemDate())

  useEffect(() => {
    const timer = setInterval(() => {
      setSystemTime(getSystemTime())
      setSystemDate(getSystemDate())
    }, 1000)
    return () => clearInterval(timer)
  }, [getSystemTime, getSystemDate])

  // Issue Form State
  const [issueProduct, setIssueProduct] = useState(products[0]?.product_name || products[0]?.name || '')
  const [issueQty, setIssueQty] = useState(1)
  const [issuedTo, setIssuedTo] = useState('Operations Team')
  const [issuePurpose, setIssuePurpose] = useState('Field ops deployment')

  // Return Form State
  const [returnProduct, setReturnProduct] = useState(products[0]?.product_name || products[0]?.name || '')
  const [returnQty, setReturnQty] = useState(1)
  const [returnedFrom, setReturnedFrom] = useState('Operations Team')
  const [returnCondition, setReturnCondition] = useState('Good condition')
  const [returnNotes, setReturnNotes] = useState('Cleaned and inspected')

  // Find currently selected products for real-time stock indicator
  const selectedIssueProd = products.find(
    (p) => (p.product_name || p.name) === issueProduct || String(p.id) === String(issueProduct) || String(p.product_id) === String(issueProduct)
  ) || products[0]

  const selectedReturnProd = products.find(
    (p) => (p.product_name || p.name) === returnProduct || String(p.id) === String(returnProduct) || String(p.product_id) === String(returnProduct)
  ) || products[0]

  // Handle scanned barcode from camera scanner
  const handleBarcodeScanned = (code) => {
    const cleanCode = (code || '').trim().toLowerCase()
    const matched = products.find(
      (p) =>
        (p.barcode || '').toLowerCase() === cleanCode ||
        (p.secCatPartNo || p.sku || '').toLowerCase() === cleanCode ||
        (p.serNo || p.id || p.product_id || '').toLowerCase() === cleanCode ||
        (p.product_name || p.name || '').toLowerCase().includes(cleanCode)
    )

    if (matched) {
      if (scannerTargetForm === 'ISSUE') {
        setIssueProduct(matched.product_name || matched.name)
      } else {
        setReturnProduct(matched.product_name || matched.name)
      }
      setFeedback(`✓ Scanner identified asset: ${matched.product_name || matched.name} (Barcode: ${matched.barcode})`)
      setTimeout(() => setFeedback(''), 4000)
    } else {
      setFeedback(`Scanned code "${code}" not found in inventory catalog.`)
      setTimeout(() => setFeedback(''), 4000)
    }
  }

  // Handle Issue Submit
  const handleIssueSubmit = async (e) => {
    e.preventDefault()
    if (!selectedIssueProd) return

    const pid = selectedIssueProd.product_id || selectedIssueProd.id
    const curStock = Number(selectedIssueProd.available_stock ?? selectedIssueProd.systemQty ?? selectedIssueProd.qty ?? 0)

    if (curStock < Number(issueQty)) {
      setFeedback(`Cannot Issue: Requested ${issueQty} units, but only ${curStock} units are available in stock!`)
      return
    }

    try {
      const res = await issueAsset({
        productId: pid,
        quantity: Number(issueQty),
        issuedTo: issuedTo,
        purpose: issuePurpose,
        adminId: currentUser.id,
      })

      setFeedback(
        `✓ Success: Issued ${issueQty} unit(s) of ${selectedIssueProd.product_name || selectedIssueProd.name} by Admin [${currentUser.id}] at ${getSystemTime()}! Remaining Stock: ${res.updatedProduct.available_stock}`
      )
      setTimeout(() => setFeedback(''), 5000)
    } catch (err) {
      setFeedback(`Error: ${err.message}`)
    }
  }

  // Handle Return Submit
  const handleReturnSubmit = async (e) => {
    e.preventDefault()
    if (!selectedReturnProd) return

    const pid = selectedReturnProd.product_id || selectedReturnProd.id

    try {
      const res = await returnAsset({
        productId: pid,
        quantity: Number(returnQty),
        returnedFrom: returnedFrom,
        condition: returnCondition,
        notes: returnNotes,
        adminId: currentUser.id,
      })

      setFeedback(
        `✓ Success: Logged return of ${returnQty} unit(s) for ${selectedReturnProd.product_name || selectedReturnProd.name} by Admin [${currentUser.id}] at ${getSystemTime()}! Updated Stock: ${res.updatedProduct.available_stock}`
      )
      setTimeout(() => setFeedback(''), 5000)
    } catch (err) {
      setFeedback(`Error: ${err.message}`)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Top Banner with System Operator & Clock */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Issue & Return Management</h2>
          <p className="text-xs text-slate-500">
            Check out equipment, log asset returns, and verify stock balances with camera scanner integration
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Active Admin ID Pill */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Issued By: <strong>{currentUser.id}</strong> ({currentUser.name})</span>
          </div>

          {/* System Date & Time Pill */}
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-mono text-slate-700">
            <Calendar size={14} className="text-slate-400" />
            <span>{systemDate}</span>
            <Clock size={14} className="text-slate-400 ml-1" />
            <span className="font-bold text-slate-900">{systemTime}</span>
          </div>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Forms Grid */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* ISSUE ASSET FORM */}
        <form onSubmit={handleIssueSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="text-amber-600" size={20} />
              <h3 className="text-lg font-bold text-slate-900">Issue Asset / Checkout</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setScannerTargetForm('ISSUE')
                setIsScannerOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-900 hover:text-white transition"
            >
              <Camera size={14} /> Scan Barcode / QR
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <label className="mb-1.5 block font-semibold text-slate-700">Select Product</label>
              <select
                className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
                value={issueProduct}
                onChange={(e) => setIssueProduct(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id || p.product_id} value={p.product_name || p.name}>
                    {p.product_name || p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-semibold text-slate-700">Quantity to Issue</label>
              <input
                type="number"
                min="1"
                required
                className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800 font-bold"
                value={issueQty}
                onChange={(e) => setIssueQty(e.target.value)}
              />
            </div>
          </div>

          {/* Current Available Stock Indicator */}
          {selectedIssueProd && (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-slate-500" />
                <span className="text-slate-600">Barcode: <strong className="font-mono">{selectedIssueProd.barcode}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600">Available Stock:</span>
                <span className="font-mono font-bold text-sm text-emerald-700">
                  {selectedIssueProd.available_stock ?? selectedIssueProd.systemQty ?? selectedIssueProd.qty ?? 0} units
                </span>
              </div>
            </div>
          )}

          {/* Issued By (Logged-in Admin ID) & Date / Time of Issue */}
          <div className="grid gap-3 md:grid-cols-3 text-xs">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Issued By (Admin ID)</label>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-mono font-bold text-slate-900">
                <ShieldCheck size={14} className="text-indigo-600" />
                <span>{currentUser.id}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Date of Issue (System)</label>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-mono text-slate-800">
                <Calendar size={14} className="text-slate-500" />
                <span>{systemDate}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Time of Issue (System)</label>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-mono text-slate-800">
                <Clock size={14} className="text-slate-500" />
                <span>{systemTime}</span>
              </div>
            </div>
          </div>

          <div className="text-sm">
            <label className="mb-1.5 block font-semibold text-slate-700">Issued To (Person / Department)</label>
            <input
              type="text"
              required
              className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
              value={issuedTo}
              onChange={(e) => setIssuedTo(e.target.value)}
            />
          </div>

          <div className="text-sm">
            <label className="mb-1.5 block font-semibold text-slate-700">Purpose / Deployment Notes</label>
            <input
              type="text"
              required
              className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
              value={issuePurpose}
              onChange={(e) => setIssuePurpose(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition shadow-sm"
          >
            Confirm & Issue Asset (Stock -{issueQty})
          </button>
        </form>

        {/* RETURN ASSET FORM */}
        <form onSubmit={handleReturnSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="text-emerald-600" size={20} />
              <h3 className="text-lg font-bold text-slate-900">Log Asset Return</h3>
            </div>
            <button
              type="button"
              onClick={() => {
                setScannerTargetForm('RETURN')
                setIsScannerOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-900 hover:text-white transition"
            >
              <Camera size={14} /> Scan Barcode / QR
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <label className="mb-1.5 block font-semibold text-slate-700">Returned Product</label>
              <select
                className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
                value={returnProduct}
                onChange={(e) => setReturnProduct(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id || p.product_id} value={p.product_name || p.name}>
                    {p.product_name || p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block font-semibold text-slate-700">Quantity to Return</label>
              <input
                type="number"
                min="1"
                required
                className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800 font-bold"
                value={returnQty}
                onChange={(e) => setReturnQty(e.target.value)}
              />
            </div>
          </div>

          {/* Current Available Stock Indicator */}
          {selectedReturnProd && (
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-slate-500" />
                <span className="text-slate-600">Barcode: <strong className="font-mono">{selectedReturnProd.barcode}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-600">Current Stock:</span>
                <span className="font-mono font-bold text-sm text-emerald-700">
                  {selectedReturnProd.available_stock ?? selectedReturnProd.systemQty ?? selectedReturnProd.qty ?? 0} units
                </span>
              </div>
            </div>
          )}

          {/* Logged By (Admin ID) & System Date/Time */}
          <div className="grid gap-3 md:grid-cols-3 text-xs">
            <div>
              <label className="mb-1 block font-semibold text-slate-700">Logged By (Admin ID)</label>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-mono font-bold text-slate-900">
                <ShieldCheck size={14} className="text-indigo-600" />
                <span>{currentUser.id}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Date of Return</label>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-mono text-slate-800">
                <Calendar size={14} className="text-slate-500" />
                <span>{systemDate}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block font-semibold text-slate-700">Time of Return</label>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-mono text-slate-800">
                <Clock size={14} className="text-slate-500" />
                <span>{systemTime}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 text-sm">
            <div>
              <label className="mb-1.5 block font-semibold text-slate-700">Returned From (Dept / Person)</label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
                value={returnedFrom}
                onChange={(e) => setReturnedFrom(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block font-semibold text-slate-700">Condition on Return</label>
              <select
                className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
                value={returnCondition}
                onChange={(e) => setReturnCondition(e.target.value)}
              >
                <option>Good condition</option>
                <option>Minor wear</option>
                <option>Requires repair / calibration</option>
                <option>Damaged / Inoperable</option>
              </select>
            </div>
          </div>

          <div className="text-sm">
            <label className="mb-1.5 block font-semibold text-slate-700">Return Inspection Notes</label>
            <textarea
              rows="2"
              className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800 text-xs"
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-emerald-700 py-3 text-sm font-semibold text-white hover:bg-emerald-800 transition shadow-sm"
          >
            Log Asset Return (Stock +{returnQty})
          </button>
        </form>
      </div>

      {/* ALLOCATION & TRANSACTION HISTORY TABLE */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Live Allocation & Transaction History</h3>
            <p className="text-xs text-slate-500">Real-time record of asset checkouts with Admin ID, Date, and Time</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            {transactions.length} Total Logs
          </span>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Transaction ID</th>
                <th className="px-4 py-3 font-semibold">Item / Asset</th>
                <th className="px-4 py-3 font-semibold">Quantity</th>
                <th className="px-4 py-3 font-semibold">Issued By (Admin ID)</th>
                <th className="px-4 py-3 font-semibold">Issued To / From</th>
                <th className="px-4 py-3 font-semibold">Date of Issue</th>
                <th className="px-4 py-3 font-semibold">Time of Issue</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((row) => (
                <tr key={row.id || row.transaction_id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{row.id || row.transaction_id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{row.product_name || row.item}</div>
                    {row.barcode && <div className="text-[11px] font-mono text-slate-400">BC: {row.barcode}</div>}
                  </td>
                  <td className="px-4 py-3 font-bold font-mono text-slate-800">{row.quantity ?? row.qty ?? 1}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-indigo-700">
                    <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 border border-indigo-200">
                      <ShieldCheck size={12} /> {row.issuedBy || row.issued_by || currentUser.id}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-xs">{row.issued_to || row.to}</td>
                  <td className="px-4 py-3 text-slate-700 font-mono text-xs">{row.date_of_issue || row.date || systemDate}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{row.time_of_issue || '09:00:00 AM'}</td>
                  <td className="px-4 py-3">
                    <Badge tone={row.status === 'Issued' ? 'info' : row.status === 'Returned' ? 'success' : 'danger'}>
                      {row.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile History Cards */}
        <div className="grid gap-3 md:hidden">
          {transactions.map((row) => (
            <div
              key={row.id || row.transaction_id}
              className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900">{row.id || row.transaction_id}</span>
                <Badge tone={row.status === 'Issued' ? 'info' : row.status === 'Returned' ? 'success' : 'danger'}>
                  {row.status}
                </Badge>
              </div>
              <div className="font-bold text-slate-800 text-sm">{row.product_name || row.item}</div>
              <div className="flex justify-between text-slate-600">
                <span>Qty: <strong>{row.quantity ?? row.qty ?? 1} units</strong></span>
                <span className="font-mono text-indigo-700 font-bold">Admin: {row.issuedBy || row.issued_by || currentUser.id}</span>
              </div>
              <div className="flex justify-between text-slate-500 font-mono text-[11px] pt-1 border-t border-slate-200">
                <span>{row.issued_to || row.to}</span>
                <span>{row.date_of_issue || row.date} {row.time_of_issue || ''}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Barcode & QR Code Camera Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
        title={`Scan Asset Barcode for ${scannerTargetForm === 'ISSUE' ? 'Checkout' : 'Return'}`}
        productsList={products}
      />
    </div>
  )
}

