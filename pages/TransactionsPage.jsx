import { useState, useEffect } from 'react';
import { getApiBase, apiFetch } from '../api';

const MsgBox = ({ msg }) => {
  if (!msg) return null;
  const isErr = msg.type === 'error';
  return (
    <div className={`flex items-start gap-2 p-3 rounded-xl text-sm font-medium ${isErr ? 'bg-danger-bg text-danger-text' : 'bg-success-bg text-success-text'}`}>
      <span className="material-symbols-outlined text-lg flex-shrink-0">
        {isErr ? 'error' : 'check_circle'}
      </span>
      {msg.text}
    </div>
  );
};

export default function TransactionsPage() {
  const [products, setProducts]       = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading]         = useState(true);

  // Issue form state
  const [issueProductId, setIssueProductId] = useState('');
  const [issueQty, setIssueQty]             = useState(1);
  const [issueTo, setIssueTo]               = useState('');
  const [issuePurpose, setIssuePurpose]     = useState('');
  const [issueLoading, setIssueLoading]     = useState(false);
  const [issueMsg, setIssueMsg]             = useState(null);

  // Return form state
  const [returnSku, setReturnSku]           = useState('');
  const [returnProduct, setReturnProduct]   = useState(null);
  const [returnCondition, setReturnCondition] = useState('Good condition');
  const [returnNotes, setReturnNotes]       = useState('');
  const [returnLoading, setReturnLoading]   = useState(false);
  const [returnMsg, setReturnMsg]           = useState(null);

  const base = getApiBase();

  const loadAllocations = () =>
    apiFetch(`${base}/index.php?action=allocations`)
      .then(r => r.json())
      .then(d => setAllocations(Array.isArray(d) ? d : []))
      .catch(console.error);

  useEffect(() => {
    Promise.all([
      apiFetch(`${base}/index.php?action=products`).then(r => r.json()),
      apiFetch(`${base}/index.php?action=allocations`).then(r => r.json()),
    ])
      .then(([prods, allocs]) => {
        setProducts(Array.isArray(prods) ? prods : []);
        setAllocations(Array.isArray(allocs) ? allocs : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Issue handler ──────────────────────────────────────────
  const handleIssue = async (e) => {
    e.preventDefault();
    if (!issueProductId) return;
    setIssueLoading(true);
    setIssueMsg(null);
    try {
      const res = await apiFetch(`${base}/index.php?action=transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: Number(issueProductId),
          type: 'issue',
          quantity: Number(issueQty),
          notes: [issueTo && `Issued to: ${issueTo}`, issuePurpose && `Purpose: ${issuePurpose}`]
            .filter(Boolean).join('. '),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIssueMsg({ type: 'success', text: `Asset issued. New stock: ${data.new_stock}` });
        setIssueProductId(''); setIssueQty(1); setIssueTo(''); setIssuePurpose('');
        loadAllocations();
      } else {
        setIssueMsg({ type: 'error', text: data.error || 'Issue failed' });
      }
    } catch {
      setIssueMsg({ type: 'error', text: 'Connection error' });
    } finally {
      setIssueLoading(false);
    }
  };

  // ── Return lookup ──────────────────────────────────────────
  const handleReturnLookup = async (e) => {
    e.preventDefault();
    if (!returnSku.trim()) return;
    setReturnProduct(null);
    setReturnMsg(null);
    try {
      const res = await apiFetch(
        `${base}/index.php?action=product_by_barcode&barcode=${encodeURIComponent(returnSku)}`
      );
      const data = await res.json();
      if (res.ok) setReturnProduct(data);
      else setReturnMsg({ type: 'error', text: data.error || 'Product not found' });
    } catch {
      setReturnMsg({ type: 'error', text: 'Connection error' });
    }
  };

  // ── Return submit ──────────────────────────────────────────
  const handleReturn = async () => {
    if (!returnProduct) return;
    setReturnLoading(true);
    setReturnMsg(null);
    try {
      const res = await apiFetch(`${base}/index.php?action=transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: returnProduct.id,
          type: 'return',
          quantity: 1,
          notes: [`Condition: ${returnCondition}`, returnNotes].filter(Boolean).join('. '),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setReturnMsg({ type: 'success', text: `Return logged. New stock: ${data.new_stock}` });
        setReturnProduct(null); setReturnSku(''); setReturnNotes('');
        loadAllocations();
      } else {
        setReturnMsg({ type: 'error', text: data.error || 'Return failed' });
      }
    } catch {
      setReturnMsg({ type: 'error', text: 'Connection error' });
    } finally {
      setReturnLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Issue & Return Management</h1>
        <p className="text-sm text-text-secondary mt-1">Issue assets to departments or log returns</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        {/* ── Issue Asset ── */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-danger-bg flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-danger" style={{ fontSize: '18px' }}>arrow_upward</span>
            </span>
            Issue Asset
          </h2>
          <form onSubmit={handleIssue} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Product</label>
              <select
                className="input-field"
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Quantity</label>
                <input
                  type="number" min="1"
                  className="input-field"
                  value={issueQty}
                  onChange={e => setIssueQty(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Issued To</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Department / Person"
                  value={issueTo}
                  onChange={e => setIssueTo(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Purpose</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Field ops support"
                value={issuePurpose}
                onChange={e => setIssuePurpose(e.target.value)}
              />
            </div>
            <MsgBox msg={issueMsg} />
            <button type="submit" disabled={issueLoading} className="btn-primary w-full justify-center py-3">
              {issueLoading
                ? <><span className="material-symbols-outlined animate-spin">progress_activity</span> Issuing…</>
                : <><span className="material-symbols-outlined">arrow_upward</span> Issue Asset</>
              }
            </button>
          </form>
        </div>

        {/* ── Return Asset ── */}
        <div className="card p-6">
          <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-success-bg flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-success" style={{ fontSize: '18px' }}>arrow_downward</span>
            </span>
            Return Asset
          </h2>
          <div className="space-y-4">
            <form onSubmit={handleReturnLookup} className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-tertiary" style={{ fontSize: '16px' }}>barcode_scanner</span>
                <input
                  type="text"
                  className="input-field input-with-icon font-mono"
                  placeholder="Enter SKU or barcode…"
                  value={returnSku}
                  onChange={e => setReturnSku(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-ghost">Lookup</button>
            </form>

            {returnProduct && (
              <div className="p-3 rounded-xl bg-success-bg/40 border border-success/20 flex items-center gap-3">
                <span className="material-symbols-outlined text-success">check_circle</span>
                <div>
                  <div className="font-semibold text-sm text-text-primary">{returnProduct.name}</div>
                  <div className="text-xs text-text-tertiary font-mono">{returnProduct.sku} • Stock: {returnProduct.current_stock}</div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Condition</label>
              <select
                className="input-field"
                value={returnCondition}
                onChange={e => setReturnCondition(e.target.value)}
              >
                <option>Good condition</option>
                <option>Minor wear</option>
                <option>Requires repair</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Notes</label>
              <textarea
                className="input-field min-h-20 resize-none"
                placeholder="Any notes about the returned item…"
                value={returnNotes}
                onChange={e => setReturnNotes(e.target.value)}
              />
            </div>
            <MsgBox msg={returnMsg} />
            <button
              onClick={handleReturn}
              disabled={!returnProduct || returnLoading}
              className="w-full py-3 rounded-xl font-bold text-white bg-success hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {returnLoading
                ? <><span className="material-symbols-outlined animate-spin">progress_activity</span> Logging…</>
                : <><span className="material-symbols-outlined">arrow_downward</span> Log Return</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Allocation History ── */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-bold text-text-primary">Allocation History</h2>
          <p className="text-xs text-text-tertiary mt-0.5">All issue and return transactions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: '640px' }}>
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">User / Dept</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {allocations.length > 0 ? allocations.map(a => (
                <tr key={a.id} className="hover:bg-surface-raised transition-colors">
                  <td className="px-4 py-3 text-xs font-mono text-text-tertiary">
                    {String(a.transaction_date ?? '').split('T')[0]}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-sm text-text-primary">{a.product_name}</div>
                    <div className="text-xs font-mono text-text-tertiary">{a.sku}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-text-primary">{a.username || '—'}</div>
                    <div className="text-xs text-text-tertiary">{a.dept_name || 'General'}</div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-text-primary">{a.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${a.type === 'issue' ? 'badge-danger' : 'badge-success'}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>
                        {a.type === 'issue' ? 'arrow_upward' : 'arrow_downward'}
                      </span>
                      {a.type === 'issue' ? 'ISSUE' : 'RETURN'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{a.notes || '—'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-border mb-3 block">receipt_long</span>
                    <p className="text-text-secondary font-medium">No allocations yet.</p>
                    <p className="text-text-tertiary text-sm mt-1">Issue or return an asset above to see history.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {allocations.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-surface">
            <span className="text-xs text-text-tertiary">{allocations.length} records</span>
          </div>
        )}
      </div>
    </div>
  );
}
