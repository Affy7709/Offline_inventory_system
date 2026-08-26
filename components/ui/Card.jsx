export function Card({ className = '', children }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-soft ${className}`}>{children}</div>
  )
}

export function CardHeader({ className = '', children }) {
  return <div className={`p-5 pb-3 ${className}`}>{children}</div>
}

export function CardContent({ className = '', children }) {
  return <div className={`p-5 pt-0 ${className}`}>{children}</div>
}
