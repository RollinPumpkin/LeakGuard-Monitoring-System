'use client'

import React, { useState } from 'react'
import { X, Settings, AlertTriangle, AlertCircle } from 'lucide-react'
import { useThresholds } from './ThresholdProvider'

interface Props {
  onClose: () => void
}

export function SettingsModal({ onClose }: Props) {
  const { thresholds, setThresholds } = useThresholds()
  const [warning, setWarning] = useState(thresholds.warning.toString())
  const [critical, setCritical] = useState(thresholds.critical.toString())

  const handleSave = () => {
    const w = parseFloat(warning)
    const c = parseFloat(critical)
    if (!isNaN(w) && !isNaN(c)) {
      setThresholds({ warning: w, critical: c })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <Settings size={18} />
            <h2>Parameter Alarm (Ampere)</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 space-y-4">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-yellow-600 mb-1.5">
              <AlertTriangle size={15} /> Batas Warning
            </label>
            <div className="relative">
              <input 
                type="number" 
                step="0.1"
                value={warning}
                onChange={(e) => setWarning(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">A</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Sistem memasuki status Warning jika arus &gt;= {warning || 0} A.</p>
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-red-600 mb-1.5">
              <AlertCircle size={15} /> Batas Critical
            </label>
            <div className="relative">
              <input 
                type="number" 
                step="0.1"
                value={critical}
                onChange={(e) => setCritical(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-medium">A</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1">Sistem memasuki status Critical jika arus &gt;= {critical || 0} A.</p>
          </div>
        </div>

        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            Batal
          </button>
          <button onClick={handleSave} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">
            Simpan
          </button>
        </div>
      </div>
    </div>
  )
}
