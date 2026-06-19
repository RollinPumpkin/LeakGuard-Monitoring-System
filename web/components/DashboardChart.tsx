'use client'

import React, { useEffect, useState } from 'react'
import { DeviceWithLatest, SensorReading } from '@/types'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush
} from 'recharts'
import { TrendingUp, Activity } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toMilliAmp } from '@/lib/leak'

interface Props {
  devices: DeviceWithLatest[]
}

export function DashboardChart({ devices }: Props) {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

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
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('device_id', selectedDeviceId)
        .order('timestamp', { ascending: false })
        .limit(30)
      if (!active) return
      if (!error && data) setReadings((data as SensorReading[]).reverse())
      setLoading(false)
    })()
    return () => { active = false }
  }, [selectedDeviceId])

  if (devices.length === 0) return null

  const chartData = readings.map((rd) => ({
    time: format(parseISO(rd.timestamp), 'HH:mm:ss', { locale: idLocale }),
    date: format(parseISO(rd.timestamp), 'dd MMM yyyy', { locale: idLocale }),
    R: Number(toMilliAmp(rd.ir_ema_avg).toFixed(2)),
    S: Number(toMilliAmp(rd.is_ema_avg).toFixed(2)),
    T: Number(toMilliAmp(rd.it_ema_avg).toFixed(2)),
  }))

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Activity size={20} className="text-blue-600" />
            Grafik Average RST
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Pantau pergerakan rata-rata arus bocor secara langsung
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
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={24} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip 
              contentStyle={{ fontSize: 12, borderRadius: 8 }} 
              formatter={(value) => [`${Number(value ?? 0)} mA`]} 
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, marginTop: 10 }} />
            <Line type="monotone" name="Rata-rata R" dataKey="R" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" name="Rata-rata S" dataKey="S" stroke="#eab308" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" name="Rata-rata T" dataKey="T" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Brush dataKey="time" height={30} stroke="#cbd5e1" travellerWidth={10} y={260} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
