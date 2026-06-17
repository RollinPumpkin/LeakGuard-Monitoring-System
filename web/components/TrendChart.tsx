'use client'
import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { SensorReading, TrafoConfig, ThresholdConfig } from '@/types'
import { format, parseISO } from 'date-fns'

interface Props {
  readings: SensorReading[]
  configs: TrafoConfig[]
  threshold: ThresholdConfig
}

const LINE_COLORS = ['#3b82f6', '#22c55e', '#f97316']

export function TrendChart({ readings, configs, threshold }: Props) {
  const data = readings.map(r => {
    const row: Record<string, string | number> = {
      ts: format(parseISO(r.timestamp), 'HH:mm:ss'),
    }
    configs.forEach(cfg => {
      const rv = Number(r[cfg.rChannel] ?? 0)
      const sv = Number(r[cfg.sChannel] ?? 0)
      const tv = Number(r[cfg.tChannel] ?? 0)
      row[cfg.name] = parseFloat(((rv + sv + tv) / 3).toFixed(6))
    })
    return row
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-800 mb-3">
        Tren Arus — 50 Data Terakhir (rata-rata Fasa R+S+T per Trafo)
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="ts" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => Number(v).toFixed(4)} width={72} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8 }}
            formatter={(v: number) => [`${v.toFixed(4)} A`]} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
          <ReferenceLine y={threshold.warning} stroke="#f59e0b" strokeDasharray="4 4"
            label={{ value: 'Threshold', fontSize: 10, fill: '#f59e0b', position: 'right' }} />
          {configs.map((cfg, i) => (
            <Line key={cfg.name} type="monotone" dataKey={cfg.name}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
