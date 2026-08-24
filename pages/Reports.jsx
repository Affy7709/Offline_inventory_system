import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getApiBase, apiFetch } from '../api';

export default function Reports() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiBase = getApiBase();
    apiFetch(`${apiBase}/index.php?action=reports`)
    .then(r => r.json())
    .then(data => setLogs(Array.isArray(data) ? data : []))
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Warehouse Inventory Transaction Report", 14, 15);
    doc.autoTable({
      head: [['Date', 'Type', 'Product', 'Qty', 'User', 'Dept']],
      body: logs.map(l => [l.transaction_date, l.type?.toUpperCase(), l.product_name, l.quantity, l.username, l.department_name]),
      startY: 20
    });
    doc.save('inventory_report.pdf');
  };

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(logs.map(l => ({
      Date: l.transaction_date,
      Type: l.type?.toUpperCase(),
      Product: l.product_name,
      SKU: l.sku,
      Quantity: l.quantity,
      User: l.username,
      Department: l.department_name,
      Notes: l.notes
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, "inventory_report.xlsx");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-primary tracking-tight">Audit Logs & Reports</h1>
          <p className="text-sm text-text-secondary mt-1">Complete history of all inventory transactions</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={exportPDF} className="btn-ghost flex-1 sm:flex-none justify-center">
            <span className="material-symbols-outlined text-danger text-lg">picture_as_pdf</span>
            PDF
          </button>
          <button onClick={exportExcel} className="btn-ghost flex-1 sm:flex-none justify-center">
            <span className="material-symbols-outlined text-success text-lg">table_chart</span>
            Excel
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface border-b border-border text-[11px] font-bold text-text-tertiary uppercase tracking-wider">
                <th className="px-5 py-4 w-48">Date / Time</th>
                <th className="px-5 py-4">Product Details</th>
                <th className="px-5 py-4 w-32">Action</th>
                <th className="px-5 py-4 w-24 text-right">Qty</th>
                <th className="px-5 py-4">User / Dept</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <span className="material-symbols-outlined animate-spin text-4xl text-primary mb-2">progress_activity</span>
                    <p className="text-sm text-text-secondary">Loading reports...</p>
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-surface-raised transition-colors group">
                    <td className="px-5 py-4">
                      <div className="text-xs font-mono text-text-secondary">{log.transaction_date.split(' ')[0]}</div>
                      <div className="text-[11px] text-text-tertiary mt-0.5">{log.transaction_date.split(' ')[1]}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-text-primary">{log.product_name}</div>
                      <div className="text-xs text-text-tertiary font-mono mt-0.5 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">qr_code</span>
                        {log.sku}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`badge ${log.type === 'issue' ? 'badge-danger' : 'badge-success'} border ${log.type === 'issue' ? 'border-danger/20' : 'border-success/20'}`}>
                        {log.type === 'issue' ? (
                          <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
                        ) : (
                          <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
                        )}
                        {log.type?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-bold text-text-primary">{log.quantity}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-text-tertiary">person</span>
                        {log.username}
                      </div>
                      <div className="text-xs text-text-secondary mt-0.5">
                        {log.department_name || 'General'}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-16 text-center">
                    <span className="material-symbols-outlined text-5xl text-border mb-3 block">assignment_late</span>
                    <p className="text-text-secondary font-medium">No transactions recorded yet.</p>
                    <p className="text-text-tertiary text-sm mt-1">Actions performed in the scanner will appear here.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
