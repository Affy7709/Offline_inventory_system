import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, X, RefreshCw, Upload, CheckCircle2, AlertCircle, Sparkles, Info } from 'lucide-react'

// All 1D and 2D barcode formats
const ALL_SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
]

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Barcode & QR Code Scanner',
  productsList = [],
}) {
  const [isScanning, setIsScanning] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [scannedCode, setScannedCode] = useState('')
  const [facingMode, setFacingMode] = useState('environment') // 'environment' | 'user'
  const [availableCameras, setAvailableCameras] = useState([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const html5QrCodeRef = useRef(null)
  const fileInputRef = useRef(null)
  const nativeCameraInputRef = useRef(null)

  const containerId = 'modal-qr-reader'


  // Enumerate cameras
  useEffect(() => {
    if (isOpen) {
      Html5Qrcode.getCameras()
        .then((devices) => {
          if (devices && devices.length > 0) {
            setAvailableCameras(devices)
            const backCam = devices.find(
              (d) =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('environment')
            )
            setSelectedCameraId(backCam ? backCam.id : devices[0].id)
          }
        })
        .catch((err) => {
          console.warn('Could not enumerate cameras:', err)
        })
    }
  }, [isOpen])

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop()
        }
      } catch (err) {
        console.warn('Error stopping scanner:', err)
      }
      html5QrCodeRef.current = null
    }
    setIsScanning(false)
  }

  const startScanner = async () => {
    setErrorMsg('')
    setScannedCode('')

    await stopScanner()

    try {
      const qrCodeScanner = new Html5Qrcode(containerId, {
        formatsToSupport: ALL_SUPPORTED_FORMATS,
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true,
        },
      })
      html5QrCodeRef.current = qrCodeScanner

      const config = {
        fps: 20,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const w = Math.floor(Math.min(viewfinderWidth * 0.92, 380))
          const h = Math.floor(Math.min(viewfinderHeight * 0.75, 240))
          return { width: w, height: h }
        },
        aspectRatio: 1.333,
        disableFlip: false,
      }

      const cameraConfig = selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : { facingMode: facingMode }

      await qrCodeScanner.start(
        cameraConfig,
        config,
        async (decodedText) => {
          setScannedCode(decodedText)
          await stopScanner()
          if (onScanSuccess) {
            onScanSuccess(decodedText)
          }
        },
        () => {}
      )

      setIsScanning(true)
    } catch (err) {
      console.error('Camera start error:', err)
      setErrorMsg(
        'Unable to access camera. Please check camera permissions, or use File Upload / Test Simulator below.'
      )
      setIsScanning(false)
    }
  }

  // Handle image file scan with multi-pass optical detection
  const handleFileScan = async (e) => {
    const rawFile = e.target.files?.[0]
    if (!rawFile) return

    e.target.value = ''
    setErrorMsg('')
    setScannedCode('')

    try {
      await stopScanner()

      // Pass 1: Native BarcodeDetector (Google Play Services ML Kit)
      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({
            formats: ['code_128', 'code_39', 'code_93', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'itf', 'data_matrix'],
          })
          const imgBitmap = await createImageBitmap(rawFile)
          const detected = await detector.detect(imgBitmap)
          if (detected && detected.length > 0 && detected[0].rawValue) {
            setScannedCode(detected[0].rawValue)
            if (onScanSuccess) {
              onScanSuccess(detected[0].rawValue)
            }
            return
          }
        } catch (detectorErr) {
          console.warn('Native BarcodeDetector pass failed in modal, trying canvas:', detectorErr)
        }
      }

      // Pass 2: Downscale and contrast-enhanced canvas
      const optimizedBlob = await new Promise((resolve) => {
        const img = new Image()
        const reader = new FileReader()
        reader.onload = (ev) => {
          img.onload = () => {
            const maxDim = 1200
            let width = img.width
            let height = img.height
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width)
                width = maxDim
              } else {
                width = Math.round((width * maxDim) / height)
                height = maxDim
              }
            }
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, width, height)
            canvas.toBlob((blob) => {
              resolve(blob ? new File([blob], 'scan.jpg', { type: 'image/jpeg' }) : rawFile)
            }, 'image/jpeg', 0.95)
          }
          img.onerror = () => resolve(rawFile)
          img.src = ev.target.result
        }
        reader.onerror = () => resolve(rawFile)
        reader.readAsDataURL(rawFile)
      })

      const scanner = new Html5Qrcode(containerId, {
        formatsToSupport: ALL_SUPPORTED_FORMATS,
        verbose: false,
      })
      html5QrCodeRef.current = scanner
      const decodedText = await scanner.scanFile(optimizedBlob, true)
      setScannedCode(decodedText)
      if (onScanSuccess) {
        onScanSuccess(decodedText)
      }
    } catch (err) {
      setErrorMsg('No readable barcode or QR code found. Hold camera closer, avoid glare, and ensure the barcode is in focus.')
    }
  }


  // Quick simulation helper
  const handleSimulateScan = (code) => {
    setScannedCode(code)
    stopScanner()
    if (onScanSuccess) {
      onScanSuccess(code)
    }
  }

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        startScanner()
      }, 300)
      return () => clearTimeout(timer)
    } else {
      stopScanner()
    }
    return () => {
      stopScanner()
    }
  }, [isOpen, facingMode, selectedCameraId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl space-y-4 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <div className="p-2 rounded-xl bg-slate-900 text-white">
              <Camera size={18} />
            </div>
            <div>
              <h3 className="text-lg leading-tight">{title}</h3>
              <p className="text-xs text-slate-500 font-normal">
                Point camera at 1D Barcode (Code128/EAN) or 2D QR Code
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopScanner()
              onClose()
            }}
            className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Viewfinder Container */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-slate-900 flex flex-col items-center justify-center min-h-[280px] text-white">
          <div id={containerId} className="w-full h-full max-h-[320px]" />

          {/* Fallback View when camera is stopped or errored */}
          {!isScanning && !scannedCode && (
            <div className="p-6 text-center space-y-3 z-10">
              <Camera size={40} className="mx-auto text-slate-500" />
              <p className="text-sm font-semibold text-slate-300">Camera is ready</p>
              <button
                onClick={startScanner}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
              >
                Start Camera
              </button>
            </div>
          )}

          {/* Success Badge */}
          {scannedCode && (
            <div className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center p-6 text-center space-y-2 z-20 animate-in zoom-in-95">
              <CheckCircle2 size={48} className="text-emerald-400" />
              <span className="text-xs uppercase tracking-widest text-emerald-300 font-bold">
                Scan Captured
              </span>
              <p className="text-lg font-mono font-bold text-white bg-slate-900/80 px-4 py-1.5 rounded-xl border border-emerald-500/40">
                {scannedCode}
              </p>
            </div>
          )}
        </div>

        {/* Scanning Tip */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <Info size={13} className="text-slate-400 shrink-0" />
          <span>Align horizontal barcode or QR square in center of viewfinder.</span>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {availableCameras.length > 1 && (
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-slate-700 font-semibold outline-none text-xs"
              >
                {availableCameras.map((cam, idx) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={() => {
                setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
              }}
              title="Switch Camera (Front/Back)"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 hover:bg-slate-100 font-semibold transition"
            >
              <RefreshCw size={14} /> Switch
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileScan}
            />

            {/* Native camera capture for phones */}
            <input
              type="file"
              ref={nativeCameraInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileScan}
            />

            <button
              onClick={() => nativeCameraInputRef.current?.click()}
              title="Snap photo with native phone camera"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-white hover:bg-indigo-700 font-semibold transition shadow-sm"
            >
              <Camera size={14} /> 📸 Snap Photo
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload QR / Barcode Image"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700 hover:bg-slate-100 font-semibold transition"
            >
              <Upload size={14} /> Upload Image
            </button>

          </div>

          <button
            onClick={() => {
              stopScanner()
              onClose()
            }}
            className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white hover:bg-slate-800 transition"
          >
            Done
          </button>
        </div>

        {/* Quick Simulator Bar */}
        {productsList && productsList.length > 0 && (
          <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Sparkles size={13} className="text-amber-500" /> Quick Barcode Test Simulator
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {productsList.slice(0, 6).map((item) => (
                <button
                  key={item.id || item.product_id || item.barcode}
                  onClick={() => handleSimulateScan(item.barcode || item.sku || '8901234567891')}
                  className="rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-[11px] font-mono text-slate-700 hover:bg-slate-900 hover:text-white transition shadow-2xs"
                >
                  {item.product_name || item.name}: {item.barcode}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

