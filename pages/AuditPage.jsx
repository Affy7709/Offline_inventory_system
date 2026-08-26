import { useState, useEffect } from 'react';
import { getApiBase, apiFetch } from '../api';

export default function AuditPage() {
  const [logs, setLogs]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    const base = getApiBase();
    apiFetch(`${base}/index.php?action=audit_logs`)
      .then(r => r.json())
      .then(d => setLogs(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = search
    ? logs.filter(a =>
        a.username?.toLowerCase().includes(search.toLowerCase()) ||
        a.action?.toLowerCase().includes(search.toLowerCase()) ||
        a.entity?.toLowerCase().includes(search.toLowerCase())
      )
    : logs;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Audit Logs</h1>
          <p className="text-sm text-text-secondary mt-1">Complete security trail of every user action</p>
        </div>
        <div className="relative w-full sm:w-64">
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-text-tertiary"
            style={{ fontSize: '18px' }}
          >
            search
          </span>
          <input
            className="input-field input-with-icon"
            placeholder="Filter by user, action…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-border bg-warning-bg flex items-center gap-2">
          <span className="material-symbols-outlined text-warning-text text-lg">admin_panel_settings</span>
          <p className="text-xs font-semibold text-warning-text">
            Security Audit Trail — Every action performed by every user is logged below.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" style={{ minWidth: '700px' }}>
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                <th className="px-4 py-3">Log ID</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length > 0 ? filtered.map(a => {
                const isFail  = a.action?.toLowerCase().includes('fail') ||
                                a.action?.toLowerCase().includes('block');
                const isLogin = a.action?.toLowerCase().includes('login') && !isFail;
                const rowCls  = isFail ? 'bg-danger-bg/30' : isLogin ? 'bg-success-bg/20' : '';
                return (
                  <tr key={a.id} className={`hover:bg-surface-raised transition-colors ${rowCls}`}>
                    <td className="px-4 py-3 text-xs font-mono text-text-tertiary">#{a.id}</td>
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
                        <span
                          className={`material-symbols-outlined ${isFail ? 'text-danger' : isLogin ? 'text-success' : 'text-primary'}`}
                          style={{ fontSize: '16px' }}
                        >
                          {isFail ? 'gpp_bad' : isLogin ? 'login' : 'edit'}
                        </span>
                        <span className="text-sm text-text-primary">{a.action}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {a.entity
                        ? <span className="badge badge-neutral capitalize">{a.entity}</span>
                        : <span className="text-text-tertiary text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-mono text-text-secondary">
                        {String(a.timestamp ?? '').split('T')[0]}
                      </div>
                      <div className="text-[11px] text-text-tertiary">
                        {String(a.timestamp ?? '').split('T')[1]?.substring(0, 8)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-text-tertiary">{a.ip_address || '—'}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-border mb-3 block">manage_search</span>
                    <p className="text-text-secondary font-medium">No audit events found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border bg-surface">
            <span className="text-xs text-text-tertiary">{filtered.length} events (last 500)</span>
          </div>
        )}
      </div>
    </div>
  );
}
