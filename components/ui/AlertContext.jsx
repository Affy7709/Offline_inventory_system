import { createContext, useContext, useState, useCallback } from 'react'
import { AlertTriangle, CheckCircle2, AlertCircle, Info, LogOut, X } from 'lucide-react'

const AlertContext = createContext(null)

export function AlertProvider({ children }) {
  const [modalConfig, setModalConfig] = useState(null)
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 9)
    setToasts(prev => [...prev, { id, message, type }])
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const showAlert = useCallback(({ title, message, type = 'info', confirmText = 'Understood', onConfirm }) => {
    setModalConfig({
      isConfirm: false,
      title: title || (type === 'error' ? 'Notice' : 'Information'),
      message,
      type,
      confirmText,
      onConfirm: () => {
        setModalConfig(null)
        if (onConfirm) onConfirm()
      }
    })
  }, [])

  const showConfirm = useCallback(({ 
    title = 'Please Confirm', 
    message, 
    confirmText = 'Confirm', 
    cancelText = 'Cancel', 
    tone = 'danger', 
    icon = null,
    onConfirm, 
    onCancel 
  }) => {
    setModalConfig({
      isConfirm: true,
      title,
      message,
      tone,
      icon,
      confirmText,
      cancelText,
      onConfirm: () => {
        setModalConfig(null)
        if (onConfirm) onConfirm()
      },
      onCancel: () => {
        setModalConfig(null)
        if (onCancel) onCancel()
      }
    })
  }, [])

  const closeModal = useCallback(() => {
    setModalConfig(null)
  }, [])

  return (
    <AlertContext.Provider value={{ toast, showAlert, showConfirm, closeModal }}>
      {children}

      {/* ── Global Themed Modal Alert & Confirm Dialog ── */}
      {modalConfig && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={modalConfig.isConfirm ? modalConfig.onCancel : modalConfig.onConfirm}
        >
          <div 
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header Banner Accent */}
            <div className={`h-1.5 w-full ${
              modalConfig.tone === 'danger' || modalConfig.type === 'error'
                ? 'bg-rose-500'
                : modalConfig.tone === 'warning' || modalConfig.type === 'warning'
                ? 'bg-amber-500'
                : modalConfig.type === 'success'
                ? 'bg-emerald-500'
                : 'bg-slate-900'
            }`} />

            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                {/* Icon Box */}
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  modalConfig.tone === 'danger' || modalConfig.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : modalConfig.tone === 'warning' || modalConfig.type === 'warning'
                    ? 'bg-amber-50 border-amber-200 text-amber-600'
                    : modalConfig.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}>
                  {modalConfig.icon === 'logout' ? (
                    <LogOut size={22} />
                  ) : modalConfig.tone === 'danger' || modalConfig.type === 'error' ? (
                    <AlertTriangle size={22} />
                  ) : modalConfig.tone === 'warning' || modalConfig.type === 'warning' ? (
                    <AlertCircle size={22} />
                  ) : modalConfig.type === 'success' ? (
                    <CheckCircle2 size={22} />
                  ) : (
                    <Info size={22} />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    {modalConfig.title}
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed break-words">
                    {modalConfig.message}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-end gap-2.5">
                {modalConfig.isConfirm && (
                  <button
                    type="button"
                    onClick={modalConfig.onCancel}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition active:scale-95"
                  >
                    {modalConfig.cancelText}
                  </button>
                )}
                <button
                  type="button"
                  onClick={modalConfig.onConfirm}
                  className={`rounded-xl px-4 py-2.5 text-xs font-bold text-white transition active:scale-95 shadow-sm inline-flex items-center gap-1.5 ${
                    modalConfig.tone === 'danger' || modalConfig.type === 'error'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : modalConfig.tone === 'warning' || modalConfig.type === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : modalConfig.type === 'success'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-slate-900 hover:bg-slate-800'
                  }`}
                >
                  {modalConfig.icon === 'logout' && <LogOut size={14} />}
                  {modalConfig.confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Global Floating Toast Stack ── */}
      {toasts.length > 0 && (
        <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3">
          {toasts.map(t => (
            <div 
              key={t.id}
              className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-slate-900/95 text-white px-4 py-3 shadow-2xl border border-slate-800 backdrop-blur-md animate-in slide-in-from-top-3 duration-200"
            >
              <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                t.type === 'success' ? 'bg-emerald-400' :
                t.type === 'error' ? 'bg-rose-400 animate-pulse' :
                t.type === 'warning' ? 'bg-amber-400' : 'bg-blue-400'
              }`} />
              <div className="text-xs font-medium flex-1 leading-snug">{t.message}</div>
              <button 
                onClick={() => removeToast(t.id)} 
                className="text-slate-400 hover:text-white text-xs p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </AlertContext.Provider>
  )
}

export function useAlert() {
  const context = useContext(AlertContext)
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider')
  }
  return context
}
