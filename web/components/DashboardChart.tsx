'use client'

import React, { useEffect, useState } from 'react'
import { DeviceWithLatest, SensorReading } from '@/types'
import { supabase } from '@/lib/supabase'
import {
  AreaChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts'
import { Activity } from 'lucide-react'
import { format, parseISO, startOfHour, startOfDay, getWeekOfMonth } from 'date-fns'
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
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month'>('day')
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
      if (timeFilter === 'day') {
        dateLimit.setHours(0, 0, 0, 0)
      } else if (timeFilter === 'week') {
        dateLimit.setDate(dateLimit.getDate() - 7)
        dateLimit.setHours(0, 0, 0, 0)
      } else {
        dateLimit.setDate(dateLimit.getDate() - 30)
      }

      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('device_id', selectedDeviceId)
        .gte('timestamp', dateLimit.toISOString())
        .order('timestamp', { ascending: true }) // Sort ascending for correct chronological order in chart

      if (!active) return
      if (!error && data) {
        setReadings(data as SensorReading[])
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [selectedDeviceId, timeFilter])

  if (devices.length === 0) return null

  const localeToUse = language === 'id' ? idLocale : enUS

  let chartData: any[] = []

  if (readings.length > 0) {
    const groups: Record<string, { count: number, R: number, S: number, T: number }> = {}
    
    readings.forEach(rd => {
      const date = parseISO(rd.timestamp)
      let key = ''
      let timeLabel = ''
      
      if (timeFilter === 'day') {
        key = format(startOfHour(date), 'yyyy-MM-dd HH:00')
        timeLabel = format(date, 'HH:00')
      } else if (timeFilter === 'week') {
        key = format(startOfDay(date), 'yyyy-MM-dd')
        timeLabel = format(date, 'EEEE', { locale: localeToUse })
      } else if (timeFilter === 'month') {
        const weekNum = getWeekOfMonth(date)
        key = `Week ${weekNum}`
        timeLabel = `Minggu ${weekNum}`
      }
      
      if (!groups[key]) {
        groups[key] = { count: 0, R: 0, S: 0, T: 0 }
      }
      
      groups[key].R += Number(toMilliAmp(phaseEmaAvg(rd, 'R')))
      groups[key].S += Number(toMilliAmp(phaseEmaAvg(rd, 'S')))
      groups[key].T += Number(toMilliAmp(phaseEmaAvg(rd, 'T')))
      groups[key].count += 1
    })
    
    chartData = Object.keys(groups).map(key => ({
      time: key,
      date: key,
      R: Number((groups[key].R / groups[key].count).toFixed(2)),
      S: Number((groups[key].S / groups[key].count).toFixed(2)),
      T: Number((groups[key].T / groups[key].count).toFixed(2)),
    }))
  }

  const formatXAxis = (val: string) => {
    try {
      let dStr = val
      if (val.startsWith('Week')) return val
      if (val.includes('W')) {
        // e.g. 2026-07-W1
        return val
      }
      const d = parseISO(dStr.replace(' ', 'T'))
      if (isNaN(d.getTime())) return val
      if (timeFilter === 'day') {
        return format(d, 'HH:mm')
      } else if (timeFilter === 'week') {
        return format(d, 'EEEE, dd/MM', { locale: language === 'id' ? idLocale : enUS })
      } else {
        const weekNum = Math.min(4, Math.ceil(d.getDate() / 7))
        return language === 'id' ? `Minggu ke-${weekNum}` : `Week ${weekNum}`
      }
    } catch(e) { return val }
  }

  const formatTooltipLabel = (label: any) => {
    try {
      if (typeof label !== 'string') return label
      if (label.startsWith('Week') || label.includes('W')) return label
      const d = parseISO(label.replace(' ', 'T'))
      if (isNaN(d.getTime())) return label
      if (timeFilter === 'day') {
        return format(d, 'dd MMM yyyy, HH:mm')
      } else if (timeFilter === 'week') {
        return format(d, 'EEEE, dd MMM yyyy', { locale: language === 'id' ? idLocale : enUS })
      } else {
        return format(d, 'MMM yyyy')
      }
    } catch(e) { return label }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity size={20} className="text-blue-600" />
            {t('average_rst_chart')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Visualisasi Rata-Rata EMA Arus Bocor
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
            onClick={() => setTimeFilter('day')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFilter === 'day' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Daily
          </button>
          <button
            onClick={() => setTimeFilter('week')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFilter === 'week' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Weekly
          </button>
          <button
            onClick={() => setTimeFilter('month')}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFilter === 'month' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Monthly
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="overflow-x-auto pb-4">
          <div style={{ minWidth: '800px', height: '320px' }}>
            <ResponsiveContainer width="100%" height="100%">
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
              minTickGap={10} 
              axisLine={false}
              tickLine={false}
              dy={10}
              tickFormatter={formatXAxis}
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
              labelFormatter={formatTooltipLabel}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, marginTop: 10 }} />
            <Area type="monotone" name={t('average_r')} dataKey="R" stroke="#ef4444" fillOpacity={1} fill="url(#colorR)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            <Area type="monotone" name={t('average_s')} dataKey="S" stroke="#eab308" fillOpacity={1} fill="url(#colorS)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            <Area type="monotone" name={t('average_t')} dataKey="T" stroke="#3b82f6" fillOpacity={1} fill="url(#colorT)" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
          </ComposedChart>
        </ResponsiveContainer>
        </div>
        </div>
      )}
    </div>
  )
}
