import { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Filter,
  Download,
  X,
  Eye,
  Edit,
  Trash2,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Camera,
  ShieldCheck,
  Calendar,
  Clock,
  QrCode,
  LayoutGrid,
  List,
  AlertTriangle,
  Package,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { useInventory } from '../context/InventoryContext'
import BarcodeScannerModal from '../components/ui/BarcodeScannerModal'

const statusTone = {
  'In Stock': 'success',
  Issued: 'info',
  'Under Maintenance': 'warning',
  'Low Stock': 'danger',
  'Out of Stock': 'danger',
}

export default function InventoryPage() {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    currentUser,
    getSystemDate,
    getSystemTime,
  } = useInventory()

  const [searchParams, setSearchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  const openNewParam = searchParams.get('new') === 'true'

  const [searchTerm, setSearchTerm] = useState(initialSearch)
  const [selectedCategory, setSelectedCategory] = useState('All categories')
  const [selectedStatus, setSelectedStatus] = useState('All statuses')
  const [layoutMode, setLayoutMode] = useState('auto') // 'auto' | 'table' | 'card'

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(openNewParam)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [deletingProduct, setDeletingProduct] = useState(null)

  const [showFiltersDrawer, setShowFiltersDrawer] = useState(false)
  const [onlyLowStock, setOnlyLowStock] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerTarget, setScannerTarget] = useState('SEARCH') // 'SEARCH' | 'ADD_FORM' | 'EDIT_FORM'
  const [feedback, setFeedback] = useState('')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  // Add Product Form State
  const [newProduct, setNewProduct] = useState({
    id: `P-${1000 + products.length + 1}`,
    serNo: `SER-${1000 + products.length + 1}`,
    secCatPartNo: '',
    sku: '',
    barcode: '',
    name: '',
    category: 'Computing',
    subCategory: 'Laptops',
    uom: 'Unit',
    unit: 'Unit',
    authQty: 15,
    systemQty: 10,
    qty: 10,
    physicalQty: 10,
    serviceable: 10,
    unserviceable: 0,
    condition: 'Good condition',
    status: 'In Stock',
    repairable: 'Yes',
    issuedTo: 'Unassigned',
    issuedBy: currentUser.id,
    location: 'Warehouse A-1',
    minStockLevel: 5,
    threshold: 5,
    dateOfEntry: getSystemDate(),
    dateOfExit: 'N/A',
    timeEntry: getSystemTime(),
    remarks: 'Manual catalog entry',
  })

  // Sync search param if changed externally
  useEffect(() => {
    const q = searchParams.get('search')
    if (q !== null) {
      setSearchTerm(q)
    }
  }, [searchParams])

  // Handle scanned barcode
  const handleBarcodeScanned = (scannedCode) => {
    if (scannerTarget === 'SEARCH') {
      setSearchTerm(scannedCode)
      setCurrentPage(1)
    } else if (scannerTarget === 'ADD_FORM') {
      setNewProduct((prev) => ({
        ...prev,
        barcode: scannedCode,
        secCatPartNo: prev.secCatPartNo || scannedCode,
        sku: prev.sku || scannedCode,
      }))
    } else if (scannerTarget === 'EDIT_FORM' && editingProduct) {
      setEditingProduct((prev) => ({
        ...prev,
        barcode: scannedCode,
      }))
    }
  }

  // Filter products based on search and filters
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      (product.product_name || product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.secCatPartNo || product.sec_cat_part_no || product.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.location || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.id || product.product_id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.barcode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.issuedTo || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory =
      selectedCategory === 'All categories' || product.category === selectedCategory

    const matchesStatus =
      selectedStatus === 'All statuses' || product.status === selectedStatus

    const matchesLowStock =
      !onlyLowStock ||
      (product.available_stock ?? product.systemQty ?? product.qty) <=
        (product.threshold ?? product.minStockLevel ?? 5)

    return matchesSearch && matchesCategory && matchesStatus && matchesLowStock
  })

  // Pagination calculation
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem)

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Item ID',
      'Asset Name',
      'SKU / Part No',
      'Barcode',
      'Category',
      'Sub-Category',
      'Available Stock',
      'Total Stock',
      'Safety Threshold',
      'Status',
      'Location',
      'Issued By',
    ]

    const rows = filteredProducts.map((p) => [
      p.serNo || p.id || p.product_id,
      p.product_name || p.name,
      p.secCatPartNo || p.sku,
      p.barcode,
      p.category,
      p.subCategory,
      p.available_stock ?? p.systemQty ?? p.qty,
      p.total_stock ?? p.authQty,
      p.threshold ?? p.minStockLevel,
      p.status,
      p.location,
      p.issuedBy || currentUser.id,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((x) => `"${(x ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Inventory_Catalog_${getSystemDate()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Handle Add Product Submit
  const handleAddProductSubmit = (e) => {
    e.preventDefault()
    if (!newProduct.name || !newProduct.secCatPartNo) {
      alert('Please fill in Asset Name and SKU / Part No.')
      return
    }

    const created = addProduct({
      ...newProduct,
      sku: newProduct.secCatPartNo,
      unit: newProduct.uom,
      threshold: Number(newProduct.minStockLevel),
      available_stock: Number(newProduct.systemQty),
      systemQty: Number(newProduct.systemQty),
      qty: Number(newProduct.systemQty),
      issuedBy: currentUser.id,
      dateOfEntry: getSystemDate(),
      timeEntry: getSystemTime(),
      image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80',
    })

    setIsAddModalOpen(false)
    setFeedback(`✓ Asset "${created.product_name || created.name}" (${created.id}) registered by Admin [${currentUser.id}]!`)
    setTimeout(() => setFeedback(''), 4000)
  }

  // Handle Open Edit Modal
  const handleOpenEdit = (prod) => {
    setEditingProduct({
      ...prod,
      name: prod.product_name || prod.name || '',
      sku: prod.secCatPartNo || prod.sku || '',
      secCatPartNo: prod.secCatPartNo || prod.sku || '',
      available_stock: prod.available_stock ?? prod.systemQty ?? prod.qty ?? 0,
      threshold: prod.threshold ?? prod.minStockLevel ?? 5,
    })
    setIsEditModalOpen(true)
  }

  // Handle Save Edit Submit
  const handleSaveEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingProduct) return

    const pid = editingProduct.product_id || editingProduct.id
    await updateProduct(pid, {
      ...editingProduct,
      product_name: editingProduct.name,
      secCatPartNo: editingProduct.sku,
      available_stock: Number(editingProduct.available_stock),
      systemQty: Number(editingProduct.available_stock),
      qty: Number(editingProduct.available_stock),
      threshold: Number(editingProduct.threshold),
      minStockLevel: Number(editingProduct.threshold),
    })

    setIsEditModalOpen(false)
    setFeedback(`✓ Asset "${editingProduct.name}" updated successfully!`)
    setTimeout(() => setFeedback(''), 4000)
  }

  // Handle Open Delete Modal
  const handleOpenDelete = (prod) => {
    setDeletingProduct(prod)
    setIsDeleteModalOpen(true)
  }

  // Handle Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingProduct) return
    const pid = deletingProduct.product_id || deletingProduct.id
    const pName = deletingProduct.product_name || deletingProduct.name

    await deleteProduct(pid)
    setIsDeleteModalOpen(false)
    setDeletingProduct(null)
    setFeedback(`✓ Asset "${pName}" (${pid}) has been deleted from inventory.`)
    setTimeout(() => setFeedback(''), 4000)
  }

  return (
    <div className="space-y-4 md:space-y-6 p-3 sm:p-4 md:p-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">Inventory Operations</p>
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Product & Asset Catalog</h2>
              <span className="rounded-full bg-slate-100 px-3 py-0.5 text-xs font-semibold text-slate-700">
                {filteredProducts.length} Items
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFiltersDrawer(!showFiltersDrawer)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs sm:text-sm font-medium transition ${
                showFiltersDrawer
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Filter size={15} />
              <span>{showFiltersDrawer ? 'Hide Filters' : 'Filters'}</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
            <button
              onClick={() => {
                setNewProduct((prev) => ({
                  ...prev,
                  id: `P-${1000 + products.length + 1}`,
                  serNo: `SER-${1000 + products.length + 1}`,
                  issuedBy: currentUser.id,
                  dateOfEntry: getSystemDate(),
                  timeEntry: getSystemTime(),
                }))
                setIsAddModalOpen(true)
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition shadow-sm active:scale-95"
            >
              <Plus size={16} />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar with Barcode Scanner Button */}
        <div className="flex flex-col gap-2.5 md:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-500 focus-within:border-slate-400 focus-within:bg-white transition">
            <Search size={16} />
            <input
              className="w-full bg-transparent outline-none text-slate-800 placeholder:text-slate-400"
              placeholder="Search by Name, SKU, Location, Barcode..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
            <button
              onClick={() => {
                setScannerTarget('SEARCH')
                setIsScannerOpen(true)
              }}
              title="Scan Barcode with Camera to Search"
              className="rounded-lg bg-white border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-900 hover:text-white transition"
            >
              <Camera size={15} />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 font-medium outline-none flex-1 sm:flex-none"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option>All categories</option>
              <option>Computing</option>
              <option>Peripherals</option>
              <option>Networking</option>
              <option>Office</option>
              <option>Accessories</option>
              <option>AV</option>
              <option>Field Ops</option>
              <option>Security</option>
            </select>

            <select
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-700 font-medium outline-none flex-1 sm:flex-none"
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value)
                setCurrentPage(1)
              }}
            >
              <option>All statuses</option>
              <option>In Stock</option>
              <option>Issued</option>
              <option>Low Stock</option>
              <option>Under Maintenance</option>
            </select>

            {/* Layout Toggle (Card vs Table) */}
            <div className="hidden sm:flex rounded-xl border border-slate-200 bg-slate-50 p-0.5">
              <button
                onClick={() => setLayoutMode('table')}
                title="Table Layout"
                className={`p-1.5 rounded-lg transition ${layoutMode === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <List size={16} />
              </button>
              <button
                onClick={() => setLayoutMode('card')}
                title="Card Layout"
                className={`p-1.5 rounded-lg transition ${layoutMode === 'card' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              >
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Extra Filter Drawer */}
        {showFiltersDrawer && (
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 animate-in fade-in">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <input
                type="checkbox"
                checked={onlyLowStock}
                onChange={(e) => setOnlyLowStock(e.target.checked)}
                className="rounded border-slate-300 text-slate-900 focus:ring-0"
              />
              <span>Show Low Stock Items Only</span>
            </label>
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('All categories')
                setSelectedStatus('All statuses')
                setOnlyLowStock(false)
              }}
              className="text-rose-600 hover:underline"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs sm:text-sm font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 size={16} />
          <span>{feedback}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* MOBILE CARDS VIEW (Shown on Mobile screens or Card layout) */}
      {/* ======================================================== */}
      <div className={`grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 ${layoutMode === 'table' ? 'hidden' : layoutMode === 'card' ? 'grid' : 'grid md:hidden'}`}>
        {currentProducts.length > 0 ? (
          currentProducts.map((product) => {
            const qty = product.available_stock ?? product.systemQty ?? product.qty ?? 0
            const thresh = product.threshold ?? product.minStockLevel ?? 5
            return (
              <div
                key={product.id || product.product_id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft space-y-3 hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image || 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80'}
                        alt={product.name || product.product_name}
                        className="h-12 w-12 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-tight">{product.product_name || product.name}</h4>
                        <span className="text-[11px] font-mono text-slate-500 font-semibold">{product.secCatPartNo || product.sku}</span>
                      </div>
                    </div>
                    <Badge tone={statusTone[product.status] || 'default'}>{product.status}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 font-medium">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Available Stock</span>
                      <span className="font-mono font-bold text-slate-900 text-sm">{qty} {product.uom || 'units'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Barcode</span>
                      <span className="font-mono font-bold text-slate-700 truncate block">{product.barcode || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Category</span>
                      <span className="text-slate-700 truncate block">{product.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase">Location</span>
                      <span className="text-slate-700 truncate block">{product.location || 'Warehouse'}</span>
                    </div>
                  </div>
                </div>

                {/* Mobile Action Buttons (View, Edit, Delete) */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="py-2 px-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-xs hover:bg-slate-50 transition flex items-center justify-center gap-1 shadow-2xs active:scale-95"
                  >
                    <Eye size={13} />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => handleOpenEdit(product)}
                    className="py-2 px-2 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-700 font-semibold text-xs hover:bg-indigo-100 transition flex items-center justify-center gap-1 shadow-2xs active:scale-95"
                  >
                    <Edit size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleOpenDelete(product)}
                    className="py-2 px-2 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-700 font-semibold text-xs hover:bg-rose-100 transition flex items-center justify-center gap-1 shadow-2xs active:scale-95"
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className="col-span-full text-center py-12 text-slate-400 text-sm bg-white rounded-2xl border border-slate-200">
            No matching equipment or assets found.
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* DESKTOP TABLE VIEW (Shown on Tablets/Desktops in Auto/Table Mode) */}
      {/* ======================================================== */}
      <div className={`rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden ${layoutMode === 'card' ? 'hidden' : layoutMode === 'table' ? 'block' : 'hidden md:block'}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Asset / Nomenclature</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Part No / SKU</th>
                <th className="px-4 py-3 font-semibold">Available Qty</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentProducts.length > 0 ? (
                currentProducts.map((product) => (
                  <tr key={product.id || product.product_id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={product.image || 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=600&q=80'}
                          alt={product.name || product.product_name}
                          className="h-10 w-10 rounded-lg object-cover border border-slate-200"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{product.product_name || product.name}</div>
                          <div className="text-xs text-slate-400 font-mono">
                            ID: {product.serNo || product.id || product.product_id} | BC: {product.barcode}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{product.category}</div>
                      <div className="text-[11px] text-slate-400">{product.subCategory}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                      {product.secCatPartNo || product.sku}
                    </td>
                    <td className="px-4 py-3 text-slate-900 font-bold">
                      {product.available_stock ?? product.systemQty ?? product.qty ?? 0}{' '}
                      <span className="text-xs font-normal text-slate-500">{product.uom || product.unit || 'units'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone[product.status] || 'default'}>{product.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-medium">{product.location}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          title="View Details"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs"
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          onClick={() => handleOpenEdit(product)}
                          title="Edit Product"
                          className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 shadow-2xs"
                        >
                          <Edit size={13} /> Edit
                        </button>
                        <button
                          onClick={() => handleOpenDelete(product)}
                          title="Delete Product"
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/70 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 shadow-2xs"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                    No matching equipment or assets found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col gap-3 sm:flex-row items-center justify-between p-4 border-t border-slate-200 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredProducts.length === 0 ? 0 : indexOfFirstItem + 1}</span> to{' '}
            <span className="font-bold text-slate-900">{Math.min(indexOfLastItem, filteredProducts.length)}</span> of{' '}
            <span className="font-bold text-slate-900">{filteredProducts.length}</span> total entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span className="px-2 font-semibold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: VIEW PRODUCT DETAIL */}
      {/* ======================================================== */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Asset Specification</span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900">{selectedProduct.product_name || selectedProduct.name}</h3>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 text-xs sm:text-sm">
              <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Item ID:</span>
                  <span className="font-mono font-bold text-slate-900">{selectedProduct.serNo || selectedProduct.id || selectedProduct.product_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Part No / SKU:</span>
                  <span className="font-mono text-slate-800">{selectedProduct.secCatPartNo || selectedProduct.sku}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Barcode:</span>
                  <span className="font-mono text-slate-800">{selectedProduct.barcode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="text-slate-800">{selectedProduct.category} ({selectedProduct.subCategory})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Issued By:</span>
                  <span className="font-mono font-bold text-indigo-700">{selectedProduct.issuedBy || currentUser.id}</span>
                </div>
              </div>

              <div className="space-y-2 rounded-xl bg-slate-50 p-4 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Available Stock:</span>
                  <span className="font-bold text-emerald-700">
                    {selectedProduct.available_stock ?? selectedProduct.systemQty ?? selectedProduct.qty ?? 0} {selectedProduct.uom || 'units'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Min Threshold:</span>
                  <span className="font-bold text-rose-600">{selectedProduct.threshold ?? selectedProduct.minStockLevel ?? 5}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <Badge tone={statusTone[selectedProduct.status] || 'default'}>{selectedProduct.status}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-medium text-slate-800">{selectedProduct.location}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date of Entry:</span>
                  <span className="text-slate-700 font-mono text-xs">{selectedProduct.dateOfEntry || getSystemDate()}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setSelectedProduct(null)
                  handleOpenEdit(selectedProduct)
                }}
                className="rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 px-4 py-2 text-xs sm:text-sm font-semibold hover:bg-indigo-100 transition inline-flex items-center gap-1.5"
              >
                <Edit size={15} /> Edit Asset
              </button>
              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT PRODUCT SPECIFICATIONS */}
      {/* ======================================================== */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleSaveEditSubmit}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Edit size={18} className="text-indigo-600" />
                  <span>Edit Product Specifications</span>
                </h3>
                <p className="text-xs text-slate-500">Item ID: <strong>{editingProduct.id || editingProduct.product_id}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="sm:col-span-2">
                <label className="mb-1 block font-semibold text-slate-700">Product / Asset Name *</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 font-medium text-sm outline-none focus:border-slate-900"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">SKU / Part No *</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 font-mono text-xs outline-none focus:border-slate-900"
                  value={editingProduct.sku}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value, secCatPartNo: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Barcode / QR Code</label>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerTarget('EDIT_FORM')
                      setIsScannerOpen(true)
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                  >
                    <Camera size={12} /> Scan Camera
                  </button>
                </div>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 font-mono text-xs outline-none focus:border-slate-900"
                  value={editingProduct.barcode || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Category</label>
                <select
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 outline-none"
                  value={editingProduct.category}
                  onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
                >
                  <option>Computing</option>
                  <option>Peripherals</option>
                  <option>Networking</option>
                  <option>Office</option>
                  <option>Accessories</option>
                  <option>AV</option>
                  <option>Field Ops</option>
                  <option>Security</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Sub-Category</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 outline-none"
                  value={editingProduct.subCategory || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, subCategory: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Available Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 font-bold font-mono outline-none"
                  value={editingProduct.available_stock}
                  onChange={(e) => setEditingProduct({ ...editingProduct, available_stock: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Min Safety Threshold</label>
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 font-mono outline-none"
                  value={editingProduct.threshold}
                  onChange={(e) => setEditingProduct({ ...editingProduct, threshold: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Store / Location</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 outline-none"
                  value={editingProduct.location || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, location: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Status</label>
                <select
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 outline-none"
                  value={editingProduct.status}
                  onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value })}
                >
                  <option>In Stock</option>
                  <option>Issued</option>
                  <option>Low Stock</option>
                  <option>Under Maintenance</option>
                  <option>Out of Stock</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION DIALOG */}
      {/* ======================================================== */}
      {isDeleteModalOpen && deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 rounded-2xl bg-rose-100">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Delete Asset Record?</h3>
                <p className="text-xs text-slate-500">This action will remove the item from inventory catalog</p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs space-y-1">
              <div><strong>Asset:</strong> {deletingProduct.product_name || deletingProduct.name}</div>
              <div><strong>Item ID:</strong> <span className="font-mono">{deletingProduct.id || deletingProduct.product_id}</span></div>
              <div><strong>SKU:</strong> <span className="font-mono">{deletingProduct.secCatPartNo || deletingProduct.sku}</span></div>
              <div><strong>Current Stock:</strong> <span className="font-bold text-slate-900">{deletingProduct.available_stock ?? deletingProduct.systemQty ?? deletingProduct.qty ?? 0} units</span></div>
            </div>

            <p className="text-xs text-slate-500">
              An audit log entry will be created under operator <strong>{currentUser.id}</strong>.
            </p>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-rose-700 transition active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: ADD PRODUCT FORM */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleAddProductSubmit}
            className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add New Inventory Product</h3>
                <p className="text-xs text-slate-500">Admin Operator: <strong>{currentUser.id}</strong></p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-xs">
              <div className="sm:col-span-2">
                <label className="mb-1 block font-semibold text-slate-700">Product / Asset Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dell Latitude 5420 Laptop"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 font-medium text-sm outline-none focus:border-slate-900"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">SKU / Part No *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DL-5420-14"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 font-mono text-xs outline-none focus:border-slate-900"
                  value={newProduct.secCatPartNo}
                  onChange={(e) => setNewProduct({ ...newProduct, secCatPartNo: e.target.value, sku: e.target.value })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Barcode / QR Code</label>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerTarget('ADD_FORM')
                      setIsScannerOpen(true)
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:underline"
                  >
                    <Camera size={12} /> Scan Camera
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. 890123456789"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 font-mono text-xs outline-none focus:border-slate-900"
                  value={newProduct.barcode}
                  onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Category</label>
                <select
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 outline-none"
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                >
                  <option>Computing</option>
                  <option>Peripherals</option>
                  <option>Networking</option>
                  <option>Office</option>
                  <option>Accessories</option>
                  <option>AV</option>
                  <option>Field Ops</option>
                  <option>Security</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Sub-Category</label>
                <input
                  type="text"
                  placeholder="e.g. Laptops"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 outline-none"
                  value={newProduct.subCategory}
                  onChange={(e) => setNewProduct({ ...newProduct, subCategory: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Initial Quantity (Available Stock)</label>
                <input
                  type="number"
                  min="0"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 font-bold font-mono outline-none"
                  value={newProduct.systemQty}
                  onChange={(e) => setNewProduct({ ...newProduct, systemQty: e.target.value, qty: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Min Stock Threshold</label>
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 font-mono outline-none"
                  value={newProduct.minStockLevel}
                  onChange={(e) => setNewProduct({ ...newProduct, minStockLevel: e.target.value, threshold: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Location / Store Room</label>
                <input
                  type="text"
                  placeholder="e.g. Warehouse A-1"
                  className="w-full rounded-xl border border-slate-300 p-2.5 text-slate-800 outline-none"
                  value={newProduct.location}
                  onChange={(e) => setNewProduct({ ...newProduct, location: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Issued By (Admin ID)</label>
                <input
                  type="text"
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 p-2.5 font-mono font-bold text-slate-700"
                  value={currentUser.id}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition active:scale-95"
              >
                Save Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Barcode & QR Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleBarcodeScanned}
        title={
          scannerTarget === 'SEARCH'
            ? 'Scan Asset Barcode to Search Catalog'
            : scannerTarget === 'ADD_FORM'
            ? 'Scan Barcode into Product Entry'
            : 'Scan Barcode to Update Product'
        }
        productsList={products}
      />
    </div>
  )
}


