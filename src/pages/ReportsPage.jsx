import { useState } from 'react'
import { reports } from '../data/mockData'
import { FileDown, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react'

export default function ReportsPage() {
  const [feedback, setFeedback] = useState('')

  const handleExportReport = (reportName, type) => {
    const reportData = [
      ['Report Name', reportName],
      ['Generated At', new Date().toLocaleString()],
      ['Status', 'Verified Official Record'],
      ['Scope', 'Enterprise Inventory Systems'],
    ]
    const csvContent = 'data:text/csv;charset=utf-8,' + reportData.map(e => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${reportName.replace(/\s+/g, '_')}_Report.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setFeedback(`Downloaded ${reportName} (${type})!`)
    setTimeout(() => setFeedback(''), 4000)
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <h2 className="text-2xl font-bold text-slate-900">Inventory Reports & Analytics</h2>
        <p className="text-xs text-slate-500">Download formatted operational summaries, audit trails, and stock evaluations</p>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 size={18} />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {reports.map((report) => (
          <div key={report.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft flex flex-col justify-between space-y-4 hover:border-slate-300 transition">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-xl bg-slate-100 p-2.5 text-slate-700">
                  {report.type === 'Summary' ? <FileText size={20} /> : report.type === 'Compliance' ? <FileSpreadsheet size={20} /> : <FileDown size={20} />}
                </div>
                <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">{report.type}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{report.name}</h3>
              <p className="mt-1 text-xs text-slate-500">Updated {report.updated}</p>
            </div>
            <button
              onClick={() => handleExportReport(report.name, report.type)}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
            >
              <FileDown size={14} /> Export CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
