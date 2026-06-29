'use client'

import React, { useEffect, useState } from 'react'
import { DeviceWithLatest, SensorReading } from '@/types'
import { supabase } from '@/lib/supabase'
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts'
import { TrendingUp, Activity } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'
import { toMilliAmp, phaseEmaAvg } from '@/lib/leak'
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
  devices: DeviceWithLatest[]
}

export function DashboardChart({ devices }: Props) {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')
  const [timeFilter, setTimeFilter] = useState<'week' | 'month'>('week')
  const { t, language } = useLanguage()

  useEffect(() => {
    if (devices.length > 0 && !selectedDeviceId) {
      setSelectedDeviceId(devices[0].device_id)
    }
  }, [devices, selectedDeviceId])

  useEffect(() => {
    if (!selectedDeviceId) return
    let active = true
    setLoading(true)
    ;(async () => {
      const dateLimit = new Date()
      if (timeFilter === 'week') {
        dateLimit.setDate(dateLimit.getDate() - 7)
      } else {
        dateLimit.setMonth(dateLimit.getMonth() - 1)
      }

      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('device_id', selectedDeviceId)
        .gte('timestamp', dateLimit.toISOString())
        .order('timestamp', { ascending: false })
        .limit(2000) // Membatasi data agar browser tidak lag
      if (!active) return
      if (!error && data) setReadings((data as SensorReading[]).reverse())
      setLoading(false)
    })()
    return () => { active = false }
  }, [selectedDeviceId, timeFilter])

  if (devices.length === 0) return null

  const chartData = readings.map((rd) => ({
    time: format(parseISO(rd.timestamp), 'HH:mm:ss', { locale: language === 'id' ? idLocale : enUS }),
    date: format(parseISO(rd.timestamp), 'dd MMM yyyy', { locale: language === 'id' ? idLocale : enUS }),
    R: Number(toMilliAmp(phaseEmaAvg(rd, 'R')).toFixed(2)),
    S: Number(toMilliAmp(phaseEmaAvg(rd, 'S')).toFixed(2)),
    T: Number(toMilliAmp(phaseEmaAvg(rd, 'T')).toFixed(2)),
    pred_R: rd.pred_R || null,
    pred_S: rd.pred_S || null,
    pred_T: rd.pred_T || null,
  }))

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity size={20} className="text-blue-600" />
            {t('average_rst_chart')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {t('average_rst_desc')}
          </p>
        </div>
        
        {devices.length > 1 && (
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
          >
            {devices.map(d => (
              <option key={d.device_id} value={d.device_id}>
                Trafo {d.device_id}
              </option>
            ))}
          </select>
        )}
        <div className="flex bg-gray-100 rounded-lg p-1 ml-auto shrink-0">
          <button
            onClick={() => setTimeFilter('week')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFilter === 'week' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t('week')}
          </button>
          <button
            onClick={() => setTimeFilter('month')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFilter === 'month' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t('month')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
            <defs>
              <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorS" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorT" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              minTickGap={24} 
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              tick={{ fontSize: 11, fill: '#64748b' }} 
              axisLine={false}
              tickLine={false}
              label={{ value: t('current_ma'), angle: -90, position: 'insideLeft', offset: -5, style: { fontSize: 12, fill: '#64748b' } }}
            />
            <Tooltip 
              contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
              formatter={(value) => [`${Number(value ?? 0)} mA`]}
              labelFormatter={(label) => `${t('time')}: ${label}`}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, marginTop: 10 }} />
            <Area type="monotone" name={t('average_r')} dataKey="R" stroke="#ef4444" fillOpacity={1} fill="url(#colorR)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            <Area type="monotone" name={t('average_s')} dataKey="S" stroke="#eab308" fillOpacity={1} fill="url(#colorS)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            <Area type="monotone" name={t('average_t')} dataKey="T" stroke="#3b82f6" fillOpacity={1} fill="url(#colorT)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            {/* Garis Riwayat Prediksi H-1 */}
            <Line type="monotone" name="Prediksi R (H-1)" dataKey="pred_R" stroke="#ef4444" strokeDasharray="5 5" dot={false} strokeWidth={2} />
            <Line type="monotone" name="Prediksi S (H-1)" dataKey="pred_S" stroke="#eab308" strokeDasharray="5 5" dot={false} strokeWidth={2} />
            <Line type="monotone" name="Prediksi T (H-1)" dataKey="pred_T" stroke="#3b82f6" strokeDasharray="5 5" dot={false} strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
