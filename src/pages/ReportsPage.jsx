import { reports } from '../data/mockData'
import { FileDown, FileSpreadsheet, FileText } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <h2 className="text-2xl font-semibold text-slate-900">Reports</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {reports.map((report) => (
          <div key={report.name} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-700">
                {report.type === 'Summary' ? <FileText size={18} /> : report.type === 'Compliance' ? <FileSpreadsheet size={18} /> : <FileDown size={18} />}
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{report.type}</span>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">{report.name}</h3>
            <p className="mt-2 text-sm text-slate-500">Updated {report.updated}</p>
            <button className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">Export</button>
          </div>
        ))}
      </div>
    </div>
  )
}
