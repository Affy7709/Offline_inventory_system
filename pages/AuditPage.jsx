import { useState, useEffect } from 'react'
import { FileSpreadsheet, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { getApiBase, apiFetch, subscribeDataSync } from '../api'
import { useAlert } from '../components/ui/AlertContext'

export default function AuditPage() {
  const { toast } = useAlert()
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)

  // Pagination state (20 per page)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLogs, setTotalLogs] = useState(0)
  const limit = 20

  const base = getApiBase()

  const loadAuditLogs = (page = currentPage, silent = false) => {
    if (!silent) setLoading(true)
    apiFetch(`${base}/index.php?action=audit_logs&page=${page}&limit=${limit}`)
      .then(r => r.json())
      .then(d => {
        if (d && Array.isArray(d.data)) {
          setAuditLogs(d.data)
          setTotalPages(d.total_pages || 1)
          setTotalLogs(d.total || 0)
        } else if (Array.isArray(d)) {
          setAuditLogs(d)
        }
      })
      .catch(console.error)
      .finally(() => { if (!silent) setLoading(false) })
  }

  useEffect(() => {
    loadAuditLogs(currentPage, false)

    const unsubscribe = subscribeDataSync(() => loadAuditLogs(currentPage, true), 3500)
    return () => unsubscribe()
  }, [base, currentPage])

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
    loadAuditLogs(newPage, false)
  }

  // Helper to safely parse old and new audit detail values cleanly
  const parseAuditDetails = (rawOld = '', rawNew = '') => {
    const oldVal = String(rawOld || '').trim()
    const newVal = String(rawNew || '').trim()

    let oldStock = oldVal
    let newStock = newVal
    let notes = ''

    if (newVal.includes('stock=')) {
      const matchNotes = newVal.match(/notes=(.+)$/)
      if (matchNotes) {
        notes = matchNotes[1].trim()
      }
      const matchStock = newVal.match(/stock=(\d+)/)
      const matchQty = newVal.match(/qty=(\d+)/)
      if (matchStock) {
        newStock = `Stock: ${matchStock[1]}`
        if (matchQty) {
          newStock += ` (${matchQty[1]})`
        }
      }
      if (oldVal.includes('stock=')) {
        const matchOld = oldVal.match(/stock=(\d+)/)
        if (matchOld) oldStock = `Stock: ${matchOld[1]}`
      }
    } else if (newVal.includes('|')) {
      const parts = newVal.split('|')
      newStock = parts[0].trim()
      notes = parts.slice(1).join('|').trim()
    } else if (newVal && !newVal.startsWith('Stock:')) {
      notes = newVal
      newStock = ''
    }

    if (notes && (notes.includes('FP:') || notes.includes('IP:'))) {
      notes = notes.split('|').filter(p => !p.trim().startsWith('FP:') && !p.trim().startsWith('IP:')).join(' | ').trim()
    }

    return { oldStock, newStock, notes }
  }

  // Export PDF
  const exportPDF = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(14)
      doc.text('Northstar AssetOps — Security & Stock Audit Logs', 14, 14)
      doc.setFontSize(9)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20)

      autoTable(doc, {
        head: [['Log ID', 'User', 'Action', 'Product / Entity', 'Stock Change & Details', 'Timestamp', 'IP Address']],
        body: auditLogs.map(a => {
          const { oldStock, newStock, notes } = parseAuditDetails(a.old_value, a.new_value)
          let details = ''
          const isStock = oldStock.startsWith('Stock:') || newStock.startsWith('Stock:')
          if (isStock) {
            details = oldStock && newStock ? `${oldStock} -> ${newStock}` : (newStock || oldStock)
            if (notes) details += ` | ${notes}`
          } else {
            details = notes
          }
          return [
            `#${a.id}`,
            a.username || 'System',
            a.action || '—',
            a.entity || '—',
            details || '—',
            String(a.timestamp || '').replace('T', ' ').substring(0, 19),
            a.ip_address || '—'
          ]
        }),
        startY: 25,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [15, 23, 42] }
      })

      doc.save('security_stock_audit_logs.pdf')
      toast('Audit logs exported to PDF successfully', 'success')
    } catch (err) {
      console.error('PDF export failed:', err)
      toast('Could not generate PDF. Please try again.', 'error')
    }
  }

  // Export Excel
  const exportExcel = () => {
    try {
      const ws = XLSX.utils.json_to_sheet(auditLogs.map(a => {
        const { oldStock, newStock, notes } = parseAuditDetails(a.old_value, a.new_value)
        let details = ''
        const isStock = oldStock.startsWith('Stock:') || newStock.startsWith('Stock:')
        if (isStock) {
          details = oldStock && newStock ? `${oldStock} -> ${newStock}` : (newStock || oldStock)
          if (notes) details += ` | ${notes}`
        } else {
          details = notes
        }
        return {
          'Log ID': a.id,
          'User': a.username || 'System',
          'Action': a.action,
          'Product / Entity': a.entity,
          'Stock Change & Details': details || '—',
          'Timestamp': a.timestamp,
          'IP Address': a.ip_address,
          'Device Fingerprint': a.device_fingerprint || ''
        }
      }))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Audit_Logs')
      XLSX.writeFile(wb, 'security_stock_audit_logs.xlsx')
      toast('Audit logs exported to Excel successfully', 'success')
    } catch (err) {
      console.error('Excel export failed:', err)
      toast('Could not export Excel. Please try again.', 'error')
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
                <th className="px-4 py-3 font-medium">Product / Record</th>
                <th className="px-4 py-3 font-medium">Stock Change & Details</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">Loading audit logs…</td>
                </tr>
              ) : auditLogs.length > 0 ? (
                auditLogs.map((entry) => {
                  const actionStr = String(entry.action || '').toLowerCase()
                  const isFail = actionStr.includes('fail') || actionStr.includes('block')
                  const isLogin = actionStr.includes('login')
                  const isIssue = actionStr.includes('issue')
                  const isReturn = actionStr.includes('return')
                  const isDelete = actionStr.includes('delete')

                  const dotColor = isFail || isDelete ? 'bg-rose-500' : isReturn ? 'bg-emerald-500' : isIssue ? 'bg-amber-500' : isLogin ? 'bg-blue-500' : 'bg-indigo-500'

                  const { oldStock, newStock, notes } = parseAuditDetails(entry.old_value, entry.new_value)
                  const isStockEntry = oldStock.startsWith('Stock:') || newStock.startsWith('Stock:')

                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">#{entry.id}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{entry.username || 'System'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-900 font-medium">
                        {entry.entity || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {isStockEntry ? (
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 font-mono text-xs">
                              {oldStock.startsWith('Stock:') && (
                                <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">
                                  {oldStock}
                                </span>
                              )}
                              {oldStock.startsWith('Stock:') && newStock.startsWith('Stock:') && (
                                <span className="text-sm font-bold text-slate-400">➔</span>
                              )}
                              {newStock.startsWith('Stock:') && (
                                <span className="rounded-md border border-slate-300 bg-slate-900 px-2 py-0.5 font-bold text-white shadow-xs">
                                  {newStock}
                                </span>
                              )}
                            </div>
                            {notes && (
                              <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                                <span className="text-slate-400">📝</span>
                                <span>{notes}</span>
                              </div>
                            )}
                          </div>
                        ) : notes ? (
                          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                            <span className="text-slate-400">📝</span>
                            <span>{notes}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                        {String(entry.timestamp || '').replace('T', ' ').substring(0, 19)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{entry.ip_address || '127.0.0.1'}</td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">No audit log records found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/50 px-4 py-3 text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold text-slate-900">{totalLogs > 0 ? (currentPage - 1) * limit + 1 : 0}</span> to{' '}
              <span className="font-semibold text-slate-900">{Math.min(currentPage * limit, totalLogs)}</span> of{' '}
              <span className="font-semibold text-slate-900">{totalLogs}</span> entries
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                <ChevronLeft size={14} />
                Previous
              </button>

              <span className="px-2 font-semibold text-slate-700">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
              >
                Next
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
