'use client'
import React, { useEffect, useState } from 'react'
import { DeviceWithLatest, SensorReading } from '@/types'
import { StatusBadge } from './StatusBadge'
import { supabase } from '@/lib/supabase'
import { predictReading, PredictionResult } from '@/lib/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { X, Zap, TrendingUp, AlertTriangle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface Props {
  device: DeviceWithLatest | null
  onClose: () => void
}

export function DeviceModal({ device, onClose }: Props) {
  const [readings, setReadings]     = useState<SensorReading[]>([])
  const [prediction, setPrediction] = useState<PredictionResult | null>(null)
  const [loading, setLoading]       = useState(false)
  const [predLoading, setPredLoading] = useState(false)

  // Ambil 20 data terbaru saat modal dibuka
  useEffect(() => {
    if (!device) return
    setLoading(true)

    supabase
      .from('sensor_readings')
      .select('*')
      .eq('device_id', device.device_id)
      .order('timestamp', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (!error && data) setReadings(data.reverse())
        setLoading(false)
      })
  }, [device])

  // Prediksi otomatis saat data reading tersedia
  useEffect(() => {
    if (!device?.latest_reading) return
    const r = device.latest_reading
    setPredLoading(true)

    predictReading({
      ch1_mA: Number(r.ch1_mA),   ch2_mA: Number(r.ch2_mA),
      ch3_mA: Number(r.ch3_mA),   ch4_mA: Number(r.ch4_mA),
      ch5_mA: Number(r.ch5_mA),   ch6_mA: Number(r.ch6_mA),
      ch7_mA: Number(r.ch7_mA),   ch8_mA: Number(r.ch8_mA),
      ch9_mA: Number(r.ch9_mA),   ch10_mA: Number(r.ch10_mA),
      ch11_mA: Number(r.ch11_mA), ch12_mA: Number(r.ch12_mA),
      base1_mA: Number(r.base1_mA),   base2_mA: Number(r.base2_mA),
      base3_mA: Number(r.base3_mA),   base4_mA: Number(r.base4_mA),
      base5_mA: Number(r.base5_mA),   base6_mA: Number(r.base6_mA),
      base7_mA: Number(r.base7_mA),   base8_mA: Number(r.base8_mA),
      base9_mA: Number(r.base9_mA),   base10_mA: Number(r.base10_mA),
      base11_mA: Number(r.base11_mA), base12_mA: Number(r.base12_mA),
    })
      .then(setPrediction)
      .catch(console.error)
      .finally(() => setPredLoading(false))
  }, [device?.latest_reading])

  if (!device) return null

  const r = device.latest_reading
  const values = r ? [r.ch1_mA, r.ch2_mA, r.ch3_mA, r.ch4_mA,
    r.ch5_mA, r.ch6_mA, r.ch7_mA, r.ch8_mA, r.ch9_mA,
    r.ch10_mA, r.ch11_mA, r.ch12_mA].map(Number) : []

  const avg   = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0
  const maxV  = values.length ? Math.max(...values) : 0
  const minV  = values.length ? Math.min(...values) : 0

  const chartData = readings.map((rd) => ({
    date: format(parseISO(rd.timestamp), 'M/d', { locale: idLocale }),
    'Leak Current': Number(rd.ch1_mA),
    'Average': Math.round((Number(rd.ch1_mA) + Number(rd.ch2_mA) +
      Number(rd.ch3_mA)) / 3),
  }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center
      justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl
        max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Transformer Details
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Detailed leak current analysis for {device.device_id}
            </p>
          </div>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info device */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Device Type', value: device.device_type },
              { label: 'Device ID',   value: device.device_id },
              { label: 'Location',    value: device.location || '—' },
              { label: 'Status Sensor', value: r?.alarm_status || '—',
                badge: r?.alarm_status },
            ].map(({ label, value, badge }) => (
              <div key={label}>
                <p className="text-xs text-gray-500 mb-1">{label}</p>
                {badge
                  ? <StatusBadge status={badge as any} size="sm" />
                  : <p className="text-sm font-medium text-gray-900">{value}</p>
                }
              </div>
            ))}
          </div>

          {/* Prediksi RF */}
          <div className={`rounded-xl p-4 border ${
            prediction?.status === 'Critical' ? 'bg-red-50 border-red-200' :
            prediction?.status === 'Warning'  ? 'bg-yellow-50 border-yellow-200' :
            'bg-green-50 border-green-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-gray-800">
                Prediksi Random Forest
              </span>
            </div>
            {predLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="animate-spin h-4 w-4 border-2 border-blue-500
                  border-t-transparent rounded-full" />
                Menghitung prediksi...
              </div>
            ) : prediction ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <StatusBadge status={prediction.status} />
                  <span className="text-sm text-gray-600">
                    Confidence: <strong>{prediction.confidence_pct}%</strong>
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-2">
                  <strong>Tindakan:</strong> {prediction.action}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>Normal: {prediction.probabilities?.Normal}%</span>
                  <span>Warning: {prediction.probabilities?.Warning}%</span>
                  <span>Critical: {prediction.probabilities?.Critical}%</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">API tidak tersedia</p>
            )}
          </div>

          {/* Statistical summary */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Statistical Summary
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Latest Reading', value: `${Number(r?.ch1_mA || 0).toFixed(0)} mA`, color: 'text-blue-600' },
                { label: 'Average Reading', value: `${avg} mA`, color: 'text-green-600' },
                { label: 'Range', value: `${minV.toFixed(0)} - ${maxV.toFixed(0)} mA`, color: 'text-gray-700' },
              ].map(({ label, value, color }) => (
                <div key={label}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">{label}</p>
                  <p className={`text-lg font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chart tren */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex
              items-center gap-2">
              <TrendingUp size={15} />
              Leak Current Trend
            </h3>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-blue-500
                  border-t-transparent rounded-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(value) => [`${Number(value ?? 0)} mA`]}
                  />
                  <Legend iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="Leak Current"
                    stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Average"
                    stroke="#22c55e" strokeWidth={2}
                    strokeDasharray="5 5" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent readings grid */}
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-3">
              Recent Readings (ch1–ch6)
            </h3>
            <div className="grid grid-cols-6 gap-2">
              {readings.slice(-12).map((rd, i) => (
                <div key={i}
                  className="bg-gray-50 rounded-lg p-2 text-center border
                  border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">
                    {Number(rd.ch1_mA).toFixed(0)}
                  </p>
                  <p className="text-xs text-gray-400">mA</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}