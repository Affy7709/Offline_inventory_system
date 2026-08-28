import { useState, useEffect } from 'react'
import { Badge } from '../components/ui/Badge'
import { getApiBase, apiFetch } from '../api'

export default function TransactionsPage() {
  const [products, setProducts] = useState([])
  const [allocations, setAllocations] = useState([])
  const [loading, setLoading] = useState(true)

  // Issue Form state
  const [issueProductId, setIssueProductId] = useState('')
  const [issueQty, setIssueQty] = useState(1)
  const [issueTo, setIssueTo] = useState('')
  const [issuePurpose, setIssuePurpose] = useState('')
  const [issueLoading, setIssueLoading] = useState(false)
  const [issueSuccess, setIssueSuccess] = useState('')
  const [issueError, setIssueError] = useState('')

  // Return Form state
  const [returnSku, setReturnSku] = useState('')
  const [returnProduct, setReturnProduct] = useState(null)
  const [returnCondition, setReturnCondition] = useState('Good condition')
  const [returnNotes, setReturnNotes] = useState('')
  const [returnLoading, setReturnLoading] = useState(false)
  const [returnSuccess, setReturnSuccess] = useState('')
  const [returnError, setReturnError] = useState('')

  const base = getApiBase()

  const loadData = () => {
    Promise.all([
      apiFetch(`${base}/index.php?action=products`).then(r => r.json()).catch(() => []),
      apiFetch(`${base}/index.php?action=allocations`).then(r => r.json()).catch(() => [])
    ]).then(([prods, allocs]) => {
      setProducts(Array.isArray(prods) ? prods : [])
      setAllocations(Array.isArray(allocs) ? allocs : [])
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [base])

  // Handle Issue
  const handleIssue = async (e) => {
    e.preventDefault()
    if (!issueProductId) return
    setIssueLoading(true)
    setIssueError('')
    setIssueSuccess('')

    try {
      const res = await apiFetch(`${base}/index.php?action=transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(issueProductId),
          type: 'issue',
          quantity: Number(issueQty),
          notes: `Issued to: ${issueTo || 'General'} | Purpose: ${issuePurpose || 'Operational'}`
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setIssueSuccess(`Asset issued successfully! Available stock: ${data.new_stock}`)
        setIssueProductId('')
        setIssueQty(1)
        setIssueTo('')
        setIssuePurpose('')
        loadData()
      } else {
        setIssueError(data.error || 'Failed to issue asset')
      }
    } catch {
      setIssueError('Network error')
    } finally {
      setIssueLoading(false)
    }
  }

  // Lookup return product
  const handleReturnLookup = async (e) => {
    e.preventDefault()
    if (!returnSku.trim()) return
    setReturnError('')
    setReturnProduct(null)

    try {
      const res = await apiFetch(`${base}/index.php?action=product_by_barcode&barcode=${encodeURIComponent(returnSku.trim())}`)
      const data = await res.json()
      if (res.ok && data) {
        setReturnProduct(data)
      } else {
        setReturnError(data.error || 'Product not found')
      }
    } catch {
      setReturnError('Network error')
    }
  }

  // Handle Return
  const handleReturn = async (e) => {
    e.preventDefault()
    if (!returnProduct) return
    setReturnLoading(true)
    setReturnError('')
    setReturnSuccess('')

    try {
      const res = await apiFetch(`${base}/index.php?action=transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: returnProduct.id,
          type: 'return',
          quantity: 1,
          notes: `Condition: ${returnCondition} | Notes: ${returnNotes}`
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setReturnSuccess(`Asset returned successfully! New stock: ${data.new_stock}`)
        setReturnProduct(null)
        setReturnSku('')
        setReturnNotes('')
        loadData()
      } else {
        setReturnError(data.error || 'Failed to log return')
      }
    } catch {
      setReturnError('Network error')
    } finally {
      setReturnLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900">Issue & return management</h2>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Issue Asset */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Issue asset</h3>

          {issueSuccess && (
            <div className="p-3 mb-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium">
              ✓ {issueSuccess}
            </div>
          )}
          {issueError && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-medium">
              ⚠ {issueError}
            </div>
          )}

          <form onSubmit={handleIssue} className="space-y-4 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-slate-600 font-medium">Product</label>
                <select 
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900 bg-white"
                  value={issueProductId}
                  onChange={e => setIssueProductId(e.target.value)}
                  required
                >
                  <option value="">Select product…</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.current_stock})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-slate-600 font-medium">Quantity</label>
                <input 
                  type="number" 
                  min="1"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900" 
                  value={issueQty}
                  onChange={e => setIssueQty(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-slate-600 font-medium">Issued to</label>
              <input 
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900" 
                placeholder="e.g. Operations Team / John Doe"
                value={issueTo}
                onChange={e => setIssueTo(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-slate-600 font-medium">Purpose</label>
              <input 
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900" 
                placeholder="Field ops support"
                value={issuePurpose}
                onChange={e => setIssuePurpose(e.target.value)}
              />
            </div>
            <button 
              type="submit" 
              disabled={issueLoading}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition disabled:opacity-50"
            >
              {issueLoading ? 'Issuing…' : 'Issue asset'}
            </button>
          </form>
        </div>

        {/* Return Asset */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-xl font-semibold text-slate-900 mb-4">Return asset</h3>

          {returnSuccess && (
            <div className="p-3 mb-4 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium">
              ✓ {returnSuccess}
            </div>
          )}
          {returnError && (
            <div className="p-3 mb-4 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-medium">
              ⚠ {returnError}
            </div>
          )}

          <div className="space-y-4 text-sm">
            <form onSubmit={handleReturnLookup} className="flex gap-2">
              <input 
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900 font-mono text-xs" 
                placeholder="Enter SKU or Barcode to return…"
                value={returnSku}
                onChange={e => setReturnSku(e.target.value)}
                required
              />
              <button type="submit" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 hover:bg-slate-100 font-medium">
                Lookup
              </button>
            </form>

            {returnProduct && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <div className="font-bold">{returnProduct.name}</div>
                <div className="text-xs text-emerald-700 font-mono">SKU: {returnProduct.sku} • Current Stock: {returnProduct.current_stock}</div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-slate-600 font-medium">Condition</label>
              <select 
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900 bg-white"
                value={returnCondition}
                onChange={e => setReturnCondition(e.target.value)}
              >
                <option>Good condition</option>
                <option>Minor wear</option>
                <option>Requires repair</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-slate-600 font-medium">Notes</label>
              <textarea 
                className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-slate-900" 
                placeholder="Inspection notes or comments…"
                value={returnNotes}
                onChange={e => setReturnNotes(e.target.value)}
              />
            </div>
            <button 
              onClick={handleReturn}
              disabled={!returnProduct || returnLoading}
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {returnLoading ? 'Logging return…' : 'Log return'}
            </button>
          </div>
        </div>
      </div>

      {/* Allocation history */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Allocation history</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr>
                <th className="pb-3 pr-4 font-medium">Date</th>
                <th className="pb-3 pr-4 font-medium">Item</th>
                <th className="pb-3 pr-4 font-medium">Issued To / User</th>
                <th className="pb-3 pr-4 font-medium">Qty</th>
                <th className="pb-3 pr-4 font-medium">Status</th>
                <th className="pb-3 pr-4 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allocations.length > 0 ? (
                allocations.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 pr-4 text-slate-500 font-mono text-xs">
                      {String(row.transaction_date || '').split('T')[0] || '—'}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-900">{row.product_name}</td>
                    <td className="py-3 pr-4 text-slate-700">{row.username || row.dept_name || 'Staff'}</td>
                    <td className="py-3 pr-4 text-slate-900 font-bold">{row.quantity}</td>
                    <td className="py-3 pr-4">
                      <Badge tone={row.type === 'issue' ? 'info' : 'success'}>
                        {row.type === 'issue' ? 'Issued' : 'Returned'}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 text-xs">{row.notes || '—'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">No allocation history recorded yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
