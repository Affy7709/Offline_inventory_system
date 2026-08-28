import { useState } from 'react'
import { allocations as initialAllocations } from '../data/mockData'
import { Badge } from '../components/ui/Badge'
import { Search, Plus, X, CheckCircle2, Download, Eye, ChevronLeft, ChevronRight, User, Phone, Mail, Shield, MapPin, ShieldCheck, Calendar, Clock } from 'lucide-react'
import { useInventory } from '../context/InventoryContext'

export default function AllocationsPage() {
  const { products, issueAsset, currentUser, getSystemDate, getSystemTime } = useInventory()
  const [allocationsList, setAllocationsList] = useState(initialAllocations)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDept, setSelectedDept] = useState('All Departments')
  const [selectedStatus, setSelectedStatus] = useState('All Statuses')
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [feedback, setFeedback] = useState('')

  // Pagination for 600 people performance
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(15)

  const [newAllocation, setNewAllocation] = useState({
    id: `EMP-${1000 + allocationsList.length + 1}`,
    user: '',
    email: '',
    phone: '',
    department: 'Engineering',
    role: 'Staff Engineer',
    asset: products[0]?.product_name || products[0]?.name || 'Dell Latitude 5420 Laptop',
    serialNo: `SN-DL-5420-${String(1000 + allocationsList.length + 1)}`,
    qty: 1,
    status: 'Issued',
    dateIssued: getSystemDate(),
    dueDate: '2026-12-31',
    officeLocation: 'HQ Tower - Floor 4',
    securityClearance: 'Level 2 - Confidential',
    condition: 'Excellent',
    issuedBy: currentUser.id,
    emergencyContact: 'Family Contact (+1 555-0199)',
    notes: 'New employee equipment deployment',
  })

  // Filter 600 people
  const filteredAllocations = allocationsList.filter((item) => {
    const matchesSearch =
      item.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.serialNo || '').toLowerCase().includes(searchTerm.toLowerCase())

    const matchesDept = selectedDept === 'All Departments' || item.department === selectedDept
    const matchesStatus = selectedStatus === 'All Statuses' || item.status === selectedStatus

    return matchesSearch && matchesDept && matchesStatus
  })

  // Pagination calculation
  const totalPages = Math.ceil(filteredAllocations.length / itemsPerPage) || 1
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentPeople = filteredAllocations.slice(indexOfFirstItem, indexOfLastItem)

  // Export 600 People CSV
  const handleExportCSV = () => {
    const headers = [
      'Employee ID', 'Full Name', 'Department', 'Role', 'Email', 'Phone',
      'Assigned Asset', 'Serial Number', 'Quantity', 'Status', 'Date Issued',
      'Due Date', 'Office Location', 'Security Clearance', 'Condition', 'Issued By'
    ]
    const rows = filteredAllocations.map(p => [
      p.id, p.user, p.department, p.role, p.email, p.phone,
      p.asset, p.serialNo, p.qty, p.status, p.dateIssued,
      p.dueDate, p.officeLocation, p.securityClearance, p.condition, p.issuedBy || currentUser.id
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.map(x => `"${(x ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Personnel_Allocations_600_Entries_${getSystemDate()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    setFeedback(`✓ Exported ${filteredAllocations.length} personnel allocation records to CSV!`)
    setTimeout(() => setFeedback(''), 4000)
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!newAllocation.user || !newAllocation.asset) return

    // Find matched product to decrement Available / System Stock
    const matchedProd = products.find((p) => (p.product_name || p.name) === newAllocation.asset)
    if (matchedProd) {
      try {
        await issueAsset({
          productId: matchedProd.product_id || matchedProd.id,
          quantity: Number(newAllocation.qty),
          issuedTo: `${newAllocation.user} (${newAllocation.department})`,
          purpose: `Equipment checkout to ${newAllocation.user}`,
          adminId: currentUser.id,
        })
      } catch (err) {
        console.warn('Issue error:', err)
      }
    }

    const created = {
      ...newAllocation,
      issuedBy: currentUser.id,
      dateIssued: getSystemDate(),
      email: newAllocation.email || `${newAllocation.user.toLowerCase().replace(/\s+/g, '.')}@northstar-ops.com`,
    }
    setAllocationsList([created, ...allocationsList])
    setIsAddModalOpen(false)
    setFeedback(`✓ Allocation assigned to ${created.user} (${created.id}) by Admin [${currentUser.id}] at ${getSystemTime()}!`)
    setTimeout(() => setFeedback(''), 4000)
  }

  return (

    <div className="space-y-6 p-4 md:p-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-soft">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-slate-500">Personnel & Asset Assignments</p>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                600 Profiles Loaded (High Speed)
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Personnel Equipment Allocations</h2>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              <Download size={16} /> Export 600 CSV
            </button>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition shadow-sm"
            >
              <Plus size={16} /> Assign Personnel
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-5 flex flex-col gap-3 md:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500 focus-within:border-slate-400 focus-within:bg-white transition">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search 600 people by Name, Employee ID, Email, Department, Serial No..."
              className="w-full bg-transparent outline-none text-slate-800 text-xs"
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
          </div>

          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none"
            value={selectedDept}
            onChange={(e) => {
              setSelectedDept(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option>All Departments</option>
            <option>Engineering</option>
            <option>Operations</option>
            <option>Field Service</option>
            <option>Finance</option>
            <option>Human Resources</option>
            <option>IT Infrastructure</option>
            <option>Marketing & Growth</option>
            <option>Executive Leadership</option>
            <option>Supply Chain</option>
            <option>Quality Assurance</option>
          </select>

          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none"
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value)
              setCurrentPage(1)
            }}
          >
            <option>All Statuses</option>
            <option>Issued</option>
            <option>Returned</option>
            <option>Under Review</option>
          </select>

          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none"
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value))
              setCurrentPage(1)
            }}
          >
            <option value={15}>15 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>
      </div>

      {feedback && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm font-semibold text-emerald-800 animate-in fade-in">
          <CheckCircle2 size={18} />
          <span>{feedback}</span>
        </div>
      )}

      {/* 600 People Table Container */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Emp ID</th>
                <th className="px-4 py-3 font-semibold">Personnel Name</th>
                <th className="px-4 py-3 font-semibold">Department & Role</th>
                <th className="px-4 py-3 font-semibold">Assigned Equipment</th>
                <th className="px-4 py-3 font-semibold">Serial No</th>
                <th className="px-4 py-3 font-semibold">Qty</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentPeople.length > 0 ? (
                currentPeople.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{entry.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{entry.user}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{entry.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div className="font-medium text-slate-800 text-xs">{entry.department}</div>
                      <div className="text-[11px] text-slate-400">{entry.role}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-800 font-medium text-xs">{entry.asset}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{entry.serialNo}</td>
                    <td className="px-4 py-3 font-bold font-mono text-slate-900">{entry.qty}</td>
                    <td className="px-4 py-3">
                      <Badge tone={entry.status === 'Issued' ? 'info' : entry.status === 'Returned' ? 'success' : 'warning'}>
                        {entry.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedPerson(entry)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-sm"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400 text-sm">
                    No matching personnel records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Allocation Cards */}
        <div className="grid gap-3 p-3 md:hidden">
          {currentPeople.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-slate-900">{entry.id}</span>
                <Badge tone={entry.status === 'Issued' ? 'info' : entry.status === 'Returned' ? 'success' : 'warning'}>
                  {entry.status}
                </Badge>
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">{entry.user}</div>
                <div className="text-slate-500 text-[11px]">{entry.department} • {entry.role}</div>
              </div>
              <div className="p-2 rounded-lg bg-white border border-slate-200/80 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Asset:</span>
                  <span className="font-medium text-slate-800">{entry.asset}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">SN:</span>
                  <span className="font-mono text-slate-700">{entry.serialNo}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedPerson(entry)}
                className="w-full py-2 rounded-lg bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition text-center shadow-2xs"
              >
                View Full Profile
              </button>
            </div>
          ))}
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col gap-3 sm:flex-row items-center justify-between p-4 border-t border-slate-200 text-xs text-slate-600">
          <div>
            Showing <span className="font-bold text-slate-900">{filteredAllocations.length === 0 ? 0 : indexOfFirstItem + 1}</span> to{' '}
            <span className="font-bold text-slate-900">{Math.min(indexOfLastItem, filteredAllocations.length)}</span> of{' '}
            <span className="font-bold text-slate-900">{filteredAllocations.length}</span> personnel records
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

      {/* FULL PERSON PROFILE MODAL */}
      {selectedPerson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-lg">
                  {selectedPerson.user.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{selectedPerson.user}</h3>
                  <p className="text-xs text-slate-500">{selectedPerson.role} • {selectedPerson.department}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPerson(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <div className="rounded-xl bg-slate-50 p-4 space-y-2 border border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Employee Details</span>
                <div className="flex justify-between"><span className="text-slate-500">Employee ID:</span><span className="font-mono font-bold text-slate-900">{selectedPerson.id}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Email:</span><span className="font-mono text-slate-800 text-xs">{selectedPerson.email}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Phone:</span><span className="font-mono text-slate-800">{selectedPerson.phone}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Office Location:</span><span className="font-medium text-slate-800">{selectedPerson.officeLocation}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Security Clearance:</span><span className="font-bold text-indigo-700 text-xs">{selectedPerson.securityClearance}</span></div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 space-y-2 border border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Asset Allocation</span>
                <div className="flex justify-between"><span className="text-slate-500">Assigned Asset:</span><span className="font-semibold text-slate-900">{selectedPerson.asset}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Serial No:</span><span className="font-mono text-slate-800">{selectedPerson.serialNo}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Quantity:</span><span className="font-bold text-slate-900">{selectedPerson.qty} units</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Status:</span><Badge tone={selectedPerson.status === 'Issued' ? 'info' : 'success'}>{selectedPerson.status}</Badge></div>
                <div className="flex justify-between"><span className="text-slate-500">Date Issued:</span><span className="text-slate-800">{selectedPerson.dateIssued}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Due Date:</span><span className="text-slate-800">{selectedPerson.dueDate}</span></div>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 border border-slate-100">
              <span className="font-bold text-slate-700 block mb-1">Deployment Notes:</span>
              <p>{selectedPerson.notes} | {selectedPerson.emergencyContact}</p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPerson(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW ALLOCATION MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <form onSubmit={handleAddSubmit} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Assign Equipment to Personnel</h3>
                <p className="text-xs text-slate-500">Register employee and checkout hardware asset</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2 text-xs">
              <div>
                <label className="mb-1 block font-semibold text-slate-700">Employee Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rachel Adams"
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
                  value={newAllocation.user}
                  onChange={(e) => setNewAllocation({ ...newAllocation, user: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Department</label>
                <select
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
                  value={newAllocation.department}
                  onChange={(e) => setNewAllocation({ ...newAllocation, department: e.target.value })}
                >
                  <option>Engineering</option>
                  <option>Operations</option>
                  <option>Field Service</option>
                  <option>Finance</option>
                  <option>Human Resources</option>
                  <option>IT Infrastructure</option>
                  <option>Marketing & Growth</option>
                  <option>Executive Leadership</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Job Title / Role</label>
                <input
                  type="text"
                  placeholder="e.g. Cloud Architect"
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
                  value={newAllocation.role}
                  onChange={(e) => setNewAllocation({ ...newAllocation, role: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Asset to Allocate *</label>
                <select
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
                  value={newAllocation.asset}
                  onChange={(e) => setNewAllocation({ ...newAllocation, asset: e.target.value })}
                >
                  {products.map((p) => (
                    <option key={p.id || p.product_id} value={p.product_name || p.name}>
                      {p.product_name || p.name} (Stock: {p.available_stock ?? p.systemQty ?? p.qty ?? 0})
                    </option>
                  ))}
                </select>
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

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800 font-bold"
                  value={newAllocation.qty}
                  onChange={(e) => setNewAllocation({ ...newAllocation, qty: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700">Office Location</label>
                <input
                  type="text"
                  placeholder="e.g. HQ Tower - Floor 4"
                  className="w-full rounded-xl border border-slate-300 p-2.5 outline-none text-slate-800"
                  value={newAllocation.officeLocation}
                  onChange={(e) => setNewAllocation({ ...newAllocation, officeLocation: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Assign Allocation
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
