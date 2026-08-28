import { X, Package, Download } from 'lucide-react'
import { Badge } from './Badge'

// Code 128 Subset B patterns table
const CODE128_PATTERNS = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
]

export function Code128BarcodeSVG({ text = '890123450001', height = 50, moduleWidth = 2 }) {
  const cleanStr = String(text).trim()
  const codeVals = [104] // Start Code B

  for (let i = 0; i < cleanStr.length; i++) {
    const code = cleanStr.charCodeAt(i)
    if (code >= 32 && code <= 126) {
      codeVals.push(code - 32)
    }
  }

  let checksum = codeVals[0]
  for (let i = 1; i < codeVals.length; i++) {
    checksum += codeVals[i] * i
  }
  codeVals.push(checksum % 103)
  codeVals.push(106) // Stop code

  let patternStr = ''
  codeVals.forEach((val) => {
    patternStr += CODE128_PATTERNS[val] || '212222'
  })

  let currentX = 8
  const rects = []
  let isBar = true

  for (let i = 0; i < patternStr.length; i++) {
    const w = parseInt(patternStr[i], 10) * moduleWidth
    if (isBar) {
      rects.push(<rect key={i} x={currentX} y={4} width={w} height={height} fill="#0f172a" />)
    }
    currentX += w
    isBar = !isBar
  }

  const svgWidth = currentX + 8

  return (
    <div className="flex flex-col items-center justify-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
      <svg width={svgWidth} height={height + 6} viewBox={`0 0 ${svgWidth} ${height + 6}`} className="max-w-full">
        {rects}
      </svg>
      <span className="font-mono text-[11px] font-bold text-slate-800 tracking-wider mt-0.5">{cleanStr}</span>
    </div>
  )
}

// Download Barcode as SVG image file
function downloadBarcodeSVG(text, productName) {
  const cleanStr = String(text || '890123450001').trim()
  const codeVals = [104]

  for (let i = 0; i < cleanStr.length; i++) {
    const code = cleanStr.charCodeAt(i)
    if (code >= 32 && code <= 126) {
      codeVals.push(code - 32)
    }
  }

  let checksum = codeVals[0]
  for (let i = 1; i < codeVals.length; i++) {
    checksum += codeVals[i] * i
  }
  codeVals.push(checksum % 103)
  codeVals.push(106)

  let patternStr = ''
  codeVals.forEach((val) => {
    patternStr += CODE128_PATTERNS[val] || '212222'
  })

  const moduleWidth = 3
  const height = 75
  let currentX = 20
  let rectsStr = ''
  let isBar = true

  for (let i = 0; i < patternStr.length; i++) {
    const w = parseInt(patternStr[i], 10) * moduleWidth
    if (isBar) {
      rectsStr += `<rect x="${currentX}" y="20" width="${w}" height="${height}" fill="#0f172a"/>`
    }
    currentX += w
    isBar = !isBar
  }

  const svgWidth = currentX + 20
  const totalHeight = height + 65
  const safeName = String(productName || 'Asset').replace(/[^a-zA-Z0-9_-]/g, '_')

  const svgXml = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${totalHeight}" viewBox="0 0 ${svgWidth} ${totalHeight}">
  <rect width="100%" height="100%" fill="#ffffff"/>
  ${rectsStr}
  <text x="${svgWidth / 2}" y="${height + 40}" font-family="monospace" font-size="14" font-weight="bold" fill="#0f172a" text-anchor="middle">${cleanStr}</text>
  <text x="${svgWidth / 2}" y="${height + 55}" font-family="sans-serif" font-size="11" fill="#64748b" text-anchor="middle">${safeName}</text>
</svg>`

  const blob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Barcode_${cleanStr}_${safeName}.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export default function ItemDetailModal({ product, isOpen, onClose }) {
  if (!isOpen || !product) return null

  const name           = product.product_name || product.name || 'Unnamed Asset'
  const barcode        = product.barcode || product.sku || 'N/A'
  const sku            = product.sku || product.secCatPartNo || product.sec_cat_part_no || 'N/A'
  const qty            = Number(product.available_stock ?? product.systemQty ?? product.qty ?? 0)
  const threshold      = Number(product.threshold || product.minStockLevel || product.min_stock_level || 5)
  const category       = product.category || product.category_name || 'General'
  const subCat         = product.subCategory || product.subcategory_name || 'Standard'
  const location       = product.location || 'Warehouse Main'
  const uom            = product.uom || product.unit || 'Unit'
  const maintenanceQty = Number(product.unserviceable ?? product.maintenanceQty ?? 0)

  const stockEmpty = qty <= 0
  const stockLow   = qty > 0 && qty <= threshold
  const status     = stockEmpty ? 'Out of Stock' : stockLow ? 'Low Stock' : 'In Stock'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in font-sans">
      {/* 2-Column Responsive Card (Fits entirely on screen without scrolling) */}
      <div className="w-full max-w-2xl rounded-2xl bg-white p-4 sm:p-5 shadow-2xl space-y-3.5 border border-slate-100">

        {/* Modal Top Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Package size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">{name}</h3>
              <p className="text-[11px] font-mono text-slate-500">SKU: {sku}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2-Column Split Content */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 items-stretch">
          
          {/* Left Column (Barcode & Stock Pill) - 2 Cols */}
          <div className="md:col-span-2 flex flex-col justify-between rounded-xl bg-slate-50/70 p-3 border border-slate-100 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Stock Status</span>
                <Badge tone={stockEmpty ? 'danger' : stockLow ? 'danger' : 'success'}>{status}</Badge>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-slate-900 font-mono">{qty}</span>
                <span className="text-xs text-slate-500 font-medium">{uom}s available</span>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Official Barcode</p>
              <Code128BarcodeSVG text={barcode} height={48} />
            </div>
          </div>

          {/* Right Column (Specifications Grid) - 3 Cols */}
          <div className="md:col-span-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2 text-ellipsis overflow-hidden">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Barcode ID</p>
              <p className="font-mono font-bold text-slate-800 mt-0.5 truncate">{barcode}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2 text-ellipsis overflow-hidden">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">SKU / Part No</p>
              <p className="font-mono font-bold text-slate-800 mt-0.5 truncate">{sku}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2 text-ellipsis overflow-hidden">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Category</p>
              <p className="font-semibold text-slate-800 mt-0.5 truncate">{category}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2 text-ellipsis overflow-hidden">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Subcategory</p>
              <p className="font-semibold text-slate-800 mt-0.5 truncate">{subCat}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2 text-ellipsis overflow-hidden">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Location</p>
              <p className="font-semibold text-slate-800 mt-0.5 truncate">{location}</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-2 text-ellipsis overflow-hidden">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">Min Threshold</p>
              <p className="font-mono font-bold text-slate-800 mt-0.5 truncate">{threshold} {uom}s</p>
            </div>
            <div className={`col-span-2 rounded-xl p-2 border flex items-center justify-between ${maintenanceQty > 0 ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
              <p className={`text-[10px] uppercase font-bold tracking-wide ${maintenanceQty > 0 ? 'text-amber-700' : 'text-slate-400'}`}>Under Maintenance Qty</p>
              <p className={`font-mono font-bold ${maintenanceQty > 0 ? 'text-amber-900 text-xs' : 'text-slate-800 text-xs'}`}>
                {maintenanceQty} {uom}s
              </p>
            </div>
          </div>

        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
          <button
            onClick={() => downloadBarcodeSVG(barcode, name)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition shadow-sm active:scale-95"
          >
            <Download size={14} />
            <span>Download Barcode</span>
          </button>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  )
}
