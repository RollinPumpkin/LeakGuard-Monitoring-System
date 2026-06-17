'use client'
import React, { useState } from 'react'
import { ThresholdConfig } from '@/types'
import { Settings, ChevronDown, ChevronUp } from 'lucide-react'

interface Props {
  threshold: ThresholdConfig
  onChange: (t: ThresholdConfig) => void
}

export function ThresholdPanel({ threshold, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState(String(threshold.warning))
  const [error, setError] = useState('')

  const apply = () => {
    const val = parseFloat(input)
    if (isNaN(val) || val <= 0) {
      setError('Masukkan angka positif')
      return
    }
    setError('')
    onChange({ warning: val })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3
          text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings size={15} className="text-gray-400" />
          <span>Konfigurasi Threshold</span>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5
            rounded-full font-semibold">
            Warning ≥ {threshold.warning} A
          </span>
        </div>
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-3">
          <p className="text-xs text-gray-500">
            Nilai ≥ threshold ditampilkan sebagai{' '}
            <strong className="text-yellow-600">Warning</strong>. Di bawahnya = Normal.
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">
                Warning Threshold (A)
              </label>
              <input
                type="number" step="0.0001" min="0.0001"
                value={input}
                onChange={e => { setInput(e.target.value); setError('') }}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">
                Slider (0.0001 – 2 A)
              </label>
              <input
                type="range" min="0.0001" max="2" step="0.0001"
                value={input}
                onChange={e => { setInput(e.target.value); setError('') }}
                className="w-full accent-blue-600"
              />
            </div>
            <button
              onClick={apply}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium
                rounded-lg hover:bg-blue-700 transition-colors"
            >
              Terapkan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
