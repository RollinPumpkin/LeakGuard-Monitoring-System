'use client'
import React from 'react'

interface PhaseGaugeProps {
  phase: 'R' | 'S' | 'T'
  value: number
  baseline: number
  status: 'Normal' | 'Warning'
  threshold: number
  size?: number
}

const PHASE_COLORS: Record<string, string> = { R: '#ef4444', S: '#f59e0b', T: '#3b82f6' }
const STATUS_STROKE: Record<string, string> = { Normal: '#22c55e', Warning: '#f59e0b' }

export function PhaseGauge({ phase, value, baseline, status, threshold, size = 90 }: PhaseGaugeProps) {
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.38
  const strokeW = size * 0.09
  const circumference = 2 * Math.PI * r
  const arcTotal = circumference * 0.75
  const pct = threshold > 0 ? Math.min(value / threshold, 1) : 0
  const arcLen = pct * arcTotal

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeW}
          strokeDasharray={`${arcTotal} ${circumference}`} strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={STATUS_STROKE[status]} strokeWidth={strokeW}
          strokeDasharray={`${arcLen} ${circumference}`} strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }} />
        <text x={cx} y={cy - size * 0.07} textAnchor="middle"
          fontSize={size * 0.22} fontWeight="bold" fill={PHASE_COLORS[phase]}>{phase}</text>
        <text x={cx} y={cy + size * 0.1} textAnchor="middle"
          fontSize={size * 0.13} fontWeight="600" fill="#111827">{value.toFixed(4)}</text>
        <text x={cx} y={cy + size * 0.23} textAnchor="middle"
          fontSize={size * 0.11} fill="#9ca3af">A</text>
      </svg>
      <span className="text-xs text-gray-400">base: {baseline.toFixed(4)}</span>
    </div>
  )
}
