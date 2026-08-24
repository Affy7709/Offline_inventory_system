import { Search, Plus, Filter, Download } from 'lucide-react'
import { products } from '../data/mockData'
import { Badge } from '../components/ui/Badge'

const statusTone = {
  'In Stock': 'success',
  Issued: 'info',
  'Under Maintenance': 'warning',
  'Low Stock': 'danger',
}

export default function InventoryPage() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm text-slate-500">Inventory</p>
            <h2 className="text-2xl font-semibold text-slate-900">Product catalog</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <Filter size={16} />
              Filters
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <Download size={16} />
              Export
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
              <Plus size={16} />
              Add product
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">
            <Search size={16} />
            <input className="w-full bg-transparent outline-none" placeholder="Search products, SKU, or location" />
          </div>
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none">
            <option>All categories</option>
            <option>Computing</option>
            <option>Networking</option>
            <option>Accessories</option>
          </select>
          <select className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-600 outline-none">
            <option>All statuses</option>
            <option>In Stock</option>
            <option>Issued</option>
            <option>Low Stock</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">Asset</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-slate-200">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={product.image} alt={product.name} className="h-10 w-10 rounded-lg object-cover" />
                      <div>
                        <div className="font-medium text-slate-900">{product.name}</div>
                        <div className="text-xs text-slate-500">{product.subCategory}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{product.category}</td>
                  <td className="px-4 py-3 text-slate-600">{product.sku}</td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{product.qty}</td>
                  <td className="px-4 py-3"><Badge tone={statusTone[product.status] || 'default'}>{product.status}</Badge></td>
                  <td className="px-4 py-3 text-slate-600">{product.location}</td>
                  <td className="px-4 py-3">
                    <button className="text-sm font-medium text-slate-700">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
