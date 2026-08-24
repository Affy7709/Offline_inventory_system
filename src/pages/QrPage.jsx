import { Camera, Search, QrCode, Download, Printer } from 'lucide-react'

export default function QrPage() {
  return (
    <div className="grid gap-6 p-4 md:p-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Field Ops</p>
            <h2 className="text-2xl font-semibold text-slate-900">QR / Barcode scanner</h2>
          </div>
          <div className="flex gap-2">
            <button className="rounded-xl border border-slate-200 p-2 text-slate-600"><Download size={18} /></button>
            <button className="rounded-xl border border-slate-200 p-2 text-slate-600"><Printer size={18} /></button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <div className="mx-auto flex h-72 max-w-md items-center justify-center rounded-2xl border-2 border-slate-300 bg-white shadow-inner">
            <div className="flex flex-col items-center gap-3 text-slate-600">
              <Camera size={42} />
              <span className="text-sm font-medium">Tablet scanner viewfinder</span>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
            <QrCode size={16} />
            <input className="w-full bg-transparent outline-none" placeholder="Scan or type code manually" />
          </div>
          <button className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">Lookup item</button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2 text-slate-700">
          <Search size={18} />
          <h3 className="text-lg font-semibold">Lookup result</h3>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">SKU</p>
              <h4 className="mt-2 text-xl font-semibold text-slate-900">DL-5420-14</h4>
            </div>
            <div className="rounded-xl bg-slate-900 p-3 text-white">
              <QrCode size={20} />
            </div>
          </div>

          <div className="mt-5 space-y-3 text-sm text-slate-600">
            <div className="flex justify-between"><span>Product</span><span className="font-medium text-slate-800">Dell Latitude 5420</span></div>
            <div className="flex justify-between"><span>Location</span><span className="font-medium text-slate-800">Warehouse B-2</span></div>
            <div className="flex justify-between"><span>Status</span><span className="font-medium text-emerald-600">In Stock</span></div>
            <div className="flex justify-between"><span>Quantity</span><span className="font-medium text-slate-800">22 units</span></div>
          </div>
        </div>
      </div>
    </div>
  )
}
