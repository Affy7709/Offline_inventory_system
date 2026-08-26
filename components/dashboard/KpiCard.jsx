import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function KpiCard({ item }) {
  const positive = item.trend === 'up'

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{item.label}</p>
          <h3 className="mt-3 text-3xl font-semibold text-slate-900">{item.value}</h3>
        </div>
        <div className={`rounded-full p-2 ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {positive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2 text-sm">
        <span className={positive ? 'text-emerald-600' : 'text-rose-600'}>{item.delta}</span>
        <span className="text-slate-500">{item.detail}</span>
      </div>
    </div>
  )
}
