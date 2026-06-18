'use client'

import React, { useEffect, useState } from 'react'
import { DeviceWithLatest, SensorReading } from '@/types'
import { StatusBadge } from './StatusBadge'
import { supabase } from '@/lib/supabase'
import {
  PHASES,
  phaseColor,
  phaseEma,
  phaseEmaAvg,
  formatMA,
  toMilliAmp,
  computeAlarmStatus,
} from '@/lib/leak'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { X, TrendingUp, Zap } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface Props {
  device: DeviceWithLatest | null
  onClose: () => void
}

export function TrafoDetailModal({ device, onClose }: Props) {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!device) return
    let active = true
    ;(async () => {
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('device_id', device.device_id)
        .order('timestamp', { ascending: false })
        .limit(30)
      if (!active) return
      if (!error && data) setReadings((data as SensorReading[]).reverse())
      setLoading(false)
    })()
    return () => { active = false }
  }, [device])

  if (!device) return null

  const r = device.latest_reading
  const status = computeAlarmStatus(r)

  const chartData = readings.map((rd) => ({
    time: format(parseISO(rd.timestamp), 'HH:mm:ss', { locale: idLocale }),
    R: Number(toMilliAmp(rd.ir_ema_avg).toFixed(2)),
    S: Number(toMilliAmp(rd.is_ema_avg).toFixed(2)),
    T: Number(toMilliAmp(rd.it_ema_avg).toFixed(2)),
  }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Detail {device.device_id}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Analisis arus bocor EMA fasa R/S/T
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Device Type', value: device.device_type },
              { label: 'Device ID', value: device.device_id },
              { label: 'Location', value: device.location || '—' },
              { label: 'Status', value: status, badge: true },
            ].map(({ label, value, badge }) => (
              <div key={label}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                {badge ? (
                  <StatusBadge status={status} size="sm" />
                ) : (
                  <p className="text-sm font-medium text-gray-900">{value}</p>
                )}
              </div>
            ))}
          </div>

          {/* Prediksi (placeholder, ML dikesampingkan) */}
          <div className="rounded-xl p-4 border bg-gray-50 border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-gray-800">
                Prediksi Random Forest
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {device.latest_prediction?.rf_status
                ? `${device.latest_prediction.rf_status} — ${device.latest_prediction.action ?? ''}`
                : 'Model machine learning sedang dalam perbaikan.'}
            </p>
          </div>

          {/* Ringkasan EMA per fasa */}
          {r && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                Ringkasan EMA (Average per Fasa)
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {PHASES.map((phase) => (
                  <div
                    key={phase}
                    className="bg-gray-50 rounded-lg p-3 border border-gray-100 text-center"
                  >
                    <p className={`text-xs font-semibold mb-1 ${phaseColor[phase]}`}>
                      Fasa {phase}
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatMA(phaseEmaAvg(r, phase))}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      sensor: {phaseEma(r, phase).map((v) => toMilliAmp(v).toFixed(1)).join(' / ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart tren EMA */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp size={15} />
              Tren Arus Bocor EMA (mA)
            </h3>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(value) => [`${Number(value ?? 0)} mA`]}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="R" stroke="#ef4444" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="S" stroke="#eab308" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="T" stroke="#3b82f6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
