import { useState, useEffect } from 'react'
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { getApiBase, apiFetch } from '../api'

export default function ReportsPage() {
  const [logs, setLogs] = useState([])
  const [audit, setAudit] = useState([])
  const [loading, setLoading] = useState(true)

  const base = getApiBase()

  useEffect(() => {
    Promise.all([
      apiFetch(`${base}/index.php?action=reports`).then(r => r.json()).catch(() => []),
      apiFetch(`${base}/index.php?action=audit_logs`).then(r => r.json()).catch(() => [])
    ]).then(([txs, auds]) => {
      setLogs(Array.isArray(txs) ? txs : [])
      setAudit(Array.isArray(auds) ? auds : [])
    }).finally(() => setLoading(false))
  }, [base])

  // PDF Export
  const exportPDF = (title, data, headers) => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' })
      doc.setFontSize(14)
      doc.text(`Northstar AssetOps — ${title}`, 14, 14)
      doc.setFontSize(9)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 20)
      
      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 25,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [15, 23, 42] }
      })

      doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('Could not generate PDF')
    }
  }

  // Excel Export
  const exportExcel = (title, jsonRecords) => {
    try {
      const ws = XLSX.utils.json_to_sheet(jsonRecords)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, title)
      XLSX.writeFile(wb, `${title.toLowerCase().replace(/\s+/g, '_')}.xlsx`)
    } catch (err) {
      console.error('Excel export failed:', err)
    }
  }

  const reportsList = [
    {
      name: 'Stock Summary',
      type: 'Summary',
      updated: `${logs.length} transactions recorded`,
      onExportPDF: () => exportPDF(
        'Transaction History',
        logs.map(l => [l.transaction_date, l.type?.toUpperCase(), l.product_name, l.sku, l.quantity, l.username, l.notes || '—']),
        ['Date', 'Type', 'Product', 'SKU', 'Qty', 'User', 'Notes']
      ),
      onExportExcel: () => exportExcel('Transactions', logs)
    },
    {
      name: 'Audit Report',
      type: 'Compliance',
      updated: `${audit.length} security events`,
      onExportPDF: () => exportPDF(
        'Security Audit Log',
        audit.map(a => [a.timestamp, a.username, a.action, a.entity || '—', a.ip_address || '—']),
        ['Timestamp', 'User', 'Action', 'Entity', 'IP Address']
      ),
      onExportExcel: () => exportExcel('Audit_Logs', audit)
    },
    {
      name: 'Issue & Return Report',
      type: 'Operations',
      updated: `${logs.filter(l => l.type === 'issue' || l.type === 'return').length} allocations`,
      onExportPDF: () => exportPDF(
        'Allocations Report',
        logs.filter(l => l.type === 'issue' || l.type === 'return').map(l => [l.transaction_date, l.type?.toUpperCase(), l.product_name, l.quantity, l.username, l.notes || '—']),
        ['Date', 'Type', 'Product', 'Qty', 'User', 'Notes']
      ),
      onExportExcel: () => exportExcel('Allocations', logs.filter(l => l.type === 'issue' || l.type === 'return'))
    },
    {
      name: 'Low Stock Alerts',
      type: 'Alert',
      updated: 'Live database sync',
      onExportPDF: () => exportPDF(
        'Stock Movement',
        logs.map(l => [l.transaction_date, l.product_name, l.old_stock ?? '—', l.new_stock ?? '—']),
        ['Date', 'Product', 'Before', 'After']
      ),
      onExportExcel: () => exportExcel('Stock_Movement', logs)
    }
  ]

  return (
    <div className="space-y-6 p-4 md:p-6 font-sans">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900">Reports & Compliance</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {reportsList.map((report) => (
          <div key={report.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                  {report.type === 'Summary' ? <FileText size={18} /> : report.type === 'Compliance' ? <FileSpreadsheet size={18} /> : <FileDown size={18} />}
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">{report.type}</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{report.name}</h3>
              <p className="mt-2 text-sm text-slate-500">{report.updated}</p>
            </div>

            <div className="mt-5 flex gap-2">
              <button 
                onClick={report.onExportPDF}
                className="flex-1 rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                Export PDF
              </button>
              <button 
                onClick={report.onExportExcel}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
              >
                Export Excel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
