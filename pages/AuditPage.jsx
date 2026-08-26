import { useState, useEffect } from 'react'
import { FileSpreadsheet, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { Badge } from '../components/ui/Badge'
import { getApiBase, apiFetch } from '../api'

const toneMap = {
  Create: 'success',
  Issue: 'info',
  Return: 'warning',
  Adjust: 'danger',
}

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const base = getApiBase()

  useEffect(() => {
    apiFetch(`${base}/index.php?action=audit_logs`)
      .then(r => r.json())
      .then(d => setAuditLogs(Array.isArray(d) ? d : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [base])

  // Export PDF
  const exportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(14)
      doc.text('Northstar AssetOps — Security Audit Logs', 14, 14)
      doc.setFontSize(9)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20)

      autoTable(doc, {
        head: [['Log ID', 'User', 'Action', 'Entity / Details', 'Timestamp', 'IP Address']],
        body: auditLogs.map(a => [
          `#${a.id}`,
          a.username || '—',
          a.action || '—',
          a.entity || a.new_value || '—',
          String(a.timestamp || '').replace('T', ' ').substring(0, 19),
          a.ip_address || '—'
        ]),
        startY: 25,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [15, 23, 42] }
      })

      doc.save('security_audit_logs.pdf')
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('Could not generate PDF. Please try again.')
    }
  }

  // Export Excel
  const exportExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(auditLogs.map(a => ({
        'Log ID': a.id,
        'User': a.username,
        'Action': a.action,
        'Entity': a.entity,
        'Details': a.new_value || a.old_value || '',
        'Timestamp': a.timestamp,
        'IP Address': a.ip_address,
        'Device Fingerprint': a.device_fingerprint || ''
      })))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Audit_Logs')
      XLSX.writeFile(wb, 'security_audit_logs.xlsx')
    } catch (err) {
      console.error('Excel export failed:', err)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <p className="text-sm text-slate-500">Security & Compliance</p>
            <h2 className="text-2xl font-semibold text-slate-900">Audit logs</h2>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={exportPDF}
              disabled={auditLogs.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
            >
              <FileText size={16} />
              Download PDF
            </button>
            <button 
              onClick={exportExcel}
              disabled={auditLogs.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
            >
              <FileSpreadsheet size={16} />
              Download Excel
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">Log ID</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Record / Entity</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">Loading audit logs…</td>
                </tr>
              ) : auditLogs.length > 0 ? (
                auditLogs.map((entry) => {
                  const isFail = entry.action?.toLowerCase().includes('fail') || entry.action?.toLowerCase().includes('block')
                  const isLogin = entry.action?.toLowerCase().includes('login')
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">#{entry.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{entry.username || 'System'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${isFail ? 'bg-rose-500' : isLogin ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{entry.entity || entry.new_value || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                        {String(entry.timestamp || '').replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{entry.ip_address || '127.0.0.1'}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">No audit log records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
