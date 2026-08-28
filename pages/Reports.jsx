import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getApiBase, apiFetch } from '../api';

// ================================================================
//  Reports.jsx — Two tabs:
//   1. Transactions — stock issues / returns with before/after stock
//   2. Audit Log   — every action with user, IP, device fingerprint
// ================================================================

const TABS = [
  { id: 'transactions', label: 'Transactions', icon: 'receipt_long' },
  { id: 'audit',        label: 'Audit Log',    icon: 'manage_search' },
];

export default function Reports() {
  const [tab,      setTab]      = useState('transactions');
  const [logs,     setLogs]     = useState([]);
  const [audit,    setAudit]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [aLoading, setALoading] = useState(false);

  const base = getApiBase();

  useEffect(() => {
    setLoading(true);
    apiFetch(`${base}/index.php?action=reports`)
      .then(r => r.json())
      .then(d => setLogs(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const loadAudit = () => {
    if (audit.length > 0) return;
    setALoading(true);
    apiFetch(`${base}/index.php?action=audit_logs`)
      .then(r => r.json())
      .then(d => setAudit(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setALoading(false));
  };

  const handleTab = (id) => {
    setTab(id);
    if (id === 'audit') loadAudit();
  };

  // ── Exports ──────────────────────────────────────────────────
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Invendor — Inventory Transaction Report', 14, 14);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 21);
    doc.autoTable({
      head: [['Date', 'Type', 'Product', 'SKU', 'Qty', 'Before', 'After', 'User', 'Dept', 'Notes']],
      body: logs.map(l => [
        l.transaction_date?.replace('T', ' ').substring(0, 19) ?? '',
        l.type?.toUpperCase(),
        l.product_name,
        l.sku,
        l.quantity,
        l.old_stock ?? '—',
        l.new_stock ?? '—',
        l.username,
        l.department_name || 'General',
        l.notes || '',
      ]),
      startY: 26,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save('invendor_transactions.pdf');
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(logs.map(l => ({
      Date:         l.transaction_date,
      Type:         l.type?.toUpperCase(),
      Product:      l.product_name,
      SKU:          l.sku,
      Quantity:     l.quantity,
      'Stock Before': l.old_stock ?? '',
      'Stock After':  l.new_stock ?? '',
      User:         l.username,
      Department:   l.department_name || 'General',
      Notes:        l.notes || '',
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, 'invendor_transactions.xlsx');
  };

  const exportAuditPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Invendor — Security Audit Log', 14, 14);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 21);
    doc.autoTable({
      head: [['Timestamp', 'User', 'Action', 'Entity', 'Before', 'After', 'IP Address']],
      body: audit.map(a => [
        a.timestamp?.replace('T', ' ').substring(0, 19) ?? '',
        a.username || '—',
        a.action,
        a.entity || '—',
        a.old_value || '',
        a.new_value || '',
        a.ip_address || '—',
      ]),
      startY: 26,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save('invendor_audit_log.pdf');
  };

  // ── Type badge ───────────────────────────────────────────────
  const TypeBadge = ({ type }) => {
    const map = {
      issue:  { cls: 'badge-danger',  icon: 'arrow_upward',   label: 'ISSUE'  },
      return: { cls: 'badge-success', icon: 'arrow_downward', label: 'RETURN' },
      add:    { cls: 'badge-info',    icon: 'add',            label: 'ADD'    },
      remove: { cls: 'badge-warning', icon: 'remove',         label: 'REMOVE' },
    };
    const m = map[type] || { cls: 'badge-neutral', icon: 'help', label: type?.toUpperCase() };
    return (
      <span className={`badge ${m.cls} border`} style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>{m.icon}</span>
        {m.label}
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Page Header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Reports & Audit</h1>
          <p className="text-sm text-text-secondary mt-1">Complete transaction history and security trail</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {tab === 'transactions' ? (
            <>
              <button onClick={exportPDF}   className="btn-ghost flex-1 sm:flex-none justify-center text-sm">
                <span className="material-symbols-outlined text-danger text-base">picture_as_pdf</span> PDF
              </button>
              <button onClick={exportExcel} className="btn-ghost flex-1 sm:flex-none justify-center text-sm">
                <span className="material-symbols-outlined text-success text-base">table_chart</span> Excel
              </button>
            </>
          ) : (
            <button onClick={exportAuditPDF} className="btn-ghost flex-1 sm:flex-none justify-center text-sm">
              <span className="material-symbols-outlined text-danger text-base">picture_as_pdf</span> Export Audit PDF
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-surface-raised rounded-xl border border-border w-full sm:w-auto sm:inline-flex">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => handleTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all flex-1 sm:flex-none justify-center ${
              tab === t.id
                ? 'bg-white text-primary shadow-sm border border-border-light'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Transactions Tab ─────────────────────────────────── */}
      {tab === 'transactions' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ minWidth: '700px' }}>
              <thead>
                <tr className="bg-surface border-b border-border text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                  <th className="px-4 py-3">Date / Time</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 w-28">Action</th>
                  <th className="px-4 py-3 w-24 text-center">Qty</th>
                  <th className="px-4 py-3 w-32 text-center">Stock Change</th>
                  <th className="px-4 py-3">User / Dept</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2 block">progress_activity</span>
                      <p className="text-sm text-text-secondary">Loading transactions…</p>
                    </td>
                  </tr>
                ) : logs.length > 0 ? (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-surface-raised transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-xs font-mono text-text-secondary">{String(log.transaction_date ?? '').split('T')[0]}</div>
                        <div className="text-[11px] text-text-tertiary">{String(log.transaction_date ?? '').split('T')[1]?.substring(0,8)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-text-primary">{log.product_name}</div>
                        <div className="text-xs text-text-tertiary font-mono flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>barcode</span>
                          {log.sku}
                        </div>
                      </td>
                      <td className="px-4 py-3"><TypeBadge type={log.type} /></td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-bold text-text-primary">{log.quantity}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {log.old_stock != null ? (
                          <div className="flex items-center justify-center gap-1 text-xs font-mono">
                            <span className="text-text-tertiary">{log.old_stock}</span>
                            <span className="material-symbols-outlined text-text-tertiary" style={{ fontSize: '14px' }}>arrow_forward</span>
                            <span className={`font-bold ${Number(log.new_stock) < Number(log.old_stock) ? 'text-danger' : 'text-success'}`}>
                              {log.new_stock}
                            </span>
                          </div>
                        ) : <span className="text-text-tertiary text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-text-primary flex items-center gap-1">
                          <span className="material-symbols-outlined text-text-tertiary" style={{ fontSize: '14px' }}>person</span>
                          {log.username}
                        </div>
                        <div className="text-xs text-text-tertiary mt-0.5">{log.department_name || 'General'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-text-secondary">{log.notes || '—'}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-16 text-center">
                      <span className="material-symbols-outlined text-5xl text-border mb-3 block">assignment_late</span>
                      <p className="text-text-secondary font-medium">No transactions recorded yet.</p>
                      <p className="text-text-tertiary text-sm mt-1">Actions in the Scanner will appear here.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {logs.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-surface flex items-center justify-between">
              <span className="text-xs text-text-tertiary">{logs.length} total records</span>
            </div>
          )}
        </div>
      )}

      {/* ── Audit Log Tab ────────────────────────────────────── */}
      {tab === 'audit' && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-border bg-warning-bg flex items-center gap-2">
            <span className="material-symbols-outlined text-warning-text text-lg">admin_panel_settings</span>
            <p className="text-xs font-semibold text-warning-text">
              Security Audit Trail — Every action performed by every user is logged below.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ minWidth: '800px' }}>
              <thead>
                <tr className="bg-surface border-b border-border text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Before</th>
                  <th className="px-4 py-3">After / Details</th>
                  <th className="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {aLoading ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center">
                      <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2 block">progress_activity</span>
                      <p className="text-sm text-text-secondary">Loading audit trail…</p>
                    </td>
                  </tr>
                ) : audit.length > 0 ? (
                  audit.map(a => {
                    const isLogin  = a.action?.toLowerCase().includes('login');
                    const isFail   = a.action?.toLowerCase().includes('fail') || a.action?.toLowerCase().includes('block');
                    const isDelete = a.action?.toLowerCase().includes('delete') || a.action?.toLowerCase().includes('remove');
                    const rowCls   = isFail ? 'bg-danger-bg/30' : isLogin ? 'bg-success-bg/20' : '';

                    return (
                      <tr key={a.id} className={`hover:bg-surface-raised transition-colors ${rowCls}`}>
                        <td className="px-4 py-3">
                          <div className="text-xs font-mono text-text-secondary">{String(a.timestamp ?? '').split('T')[0]}</div>
                          <div className="text-[11px] text-text-tertiary">{String(a.timestamp ?? '').split('T')[1]?.substring(0,8)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-outlined text-primary" style={{ fontSize: '14px' }}>person</span>
                            </div>
                            <span className="text-sm font-semibold text-text-primary">{a.username || '—'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`material-symbols-outlined ${
                              isFail ? 'text-danger' : isLogin ? 'text-success' : isDelete ? 'text-warning' : 'text-primary'
                            }`} style={{ fontSize: '16px' }}>
                              {isFail ? 'gpp_bad' : isLogin ? 'login' : isDelete ? 'delete' : 'edit'}
                            </span>
                            <span className="text-sm text-text-primary">{a.action}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {a.entity ? (
                            <span className="badge badge-neutral text-xs capitalize">{a.entity}</span>
                          ) : <span className="text-text-tertiary text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-text-tertiary">{a.old_value || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-text-secondary break-all">{a.new_value || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-text-tertiary">{a.ip_address || '—'}</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="p-16 text-center">
                      <span className="material-symbols-outlined text-5xl text-border mb-3 block">manage_search</span>
                      <p className="text-text-secondary font-medium">No audit events yet.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {audit.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-surface">
              <span className="text-xs text-text-tertiary">{audit.length} events (last 500)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
