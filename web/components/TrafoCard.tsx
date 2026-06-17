'use client'
import React, { useState, useRef, useEffect } from 'react'
import { TrafoStatus, ThresholdConfig } from '@/types'
import { PhaseGauge } from './PhaseGauge'
import { Pencil, Check } from 'lucide-react'

interface TrafoCardProps {
  trafoStatus: TrafoStatus
  onNameChange: (name: string) => void
  threshold: ThresholdConfig
}

export function TrafoCard({ trafoStatus, onNameChange, threshold }: TrafoCardProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(trafoStatus.config.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setDraft(trafoStatus.config.name) }, [trafoStatus.config.name])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const save = () => {
    const trimmed = draft.trim()
    if (trimmed) onNameChange(trimmed)
    else setDraft(trafoStatus.config.name)
    setEditing(false)
  }

  const { phases, avgCurrent, overallStatus } = trafoStatus
  const r = phases.find(p => p.phase === 'R')!
  const s = phases.find(p => p.phase === 'S')!
  const t = phases.find(p => p.phase === 'T')!

  const borderCls = overallStatus === 'Warning'
    ? 'border-yellow-300 bg-yellow-50'
    : 'border-green-200 bg-green-50'

  return (
    <div className={`rounded-xl border-2 p-4 flex flex-col gap-3 ${borderCls} transition-colors`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${overallStatus === 'Warning' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`} />
          {editing ? (
            <input ref={inputRef} value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={save}
              onKeyDown={e => { if (e.key === 'Enter') save() }}
              className="text-base font-bold text-gray-900 bg-white border border-gray-300
                rounded px-2 py-0.5 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          ) : (
            <h3 className="text-base font-bold text-gray-900">{trafoStatus.config.name}</h3>
          )}
        </div>
        <button onClick={() => editing ? save() : setEditing(true)}
          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white/60 rounded-lg transition-colors"
          title={editing ? 'Simpan' : 'Ubah nama'}>
          {editing ? <Check size={14} /> : <Pencil size={14} />}
        </button>
      </div>

      {/* Gauges — R top center, S bottom-left, T bottom-right */}
      <div className="flex flex-col items-center gap-2">
        <PhaseGauge phase="R" value={r.value} baseline={r.baseline}
          status={r.status} threshold={threshold.warning} size={88} />
        <div className="flex justify-between w-full">
          <PhaseGauge phase="S" value={s.value} baseline={s.baseline}
            status={s.status} threshold={threshold.warning} size={88} />
          <PhaseGauge phase="T" value={t.value} baseline={t.baseline}
            status={t.status} threshold={threshold.warning} size={88} />
        </div>
      </div>

      {/* Average */}
      <div className="bg-white/80 rounded-lg px-3 py-2 flex justify-between items-center">
        <span className="text-xs text-gray-500 font-medium">Rata R,S,T</span>
        <span className="text-sm font-bold text-gray-900">{avgCurrent.toFixed(4)} A</span>
      </div>

      {/* Status */}
      <div className={`text-center text-xs font-semibold rounded-full py-1
        ${overallStatus === 'Normal' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-800'}`}>
        {overallStatus}
      </div>
    </div>
  )
}
