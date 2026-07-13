'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { format, parseISO } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

interface PredictionLog {
  id: number
  device_id: string
  target_timestamp: string
  pred_r: number
  pred_s: number
  pred_t: number
  rf_status: string
  confidence: number
  action: string
  created_at: string
}

export default function PredictionDetails({ deviceId }: { deviceId: string }) {
  const [logs, setLogs] = useState<PredictionLog[]>([])
  const [loading, setLoading] = useState(true)
  const { language } = useLanguage()

  useEffect(() => {
    let active = true
    const fetchLogs = async () => {
      setLoading(true)
      // Ambil 24 prediksi terbaru (ke depan)
      const { data, error } = await supabase
        .from('prediction_logs')
        .select('*')
        .eq('device_id', deviceId)
        .order('target_timestamp', { ascending: false })
        .limit(24)

      if (error) {
        console.error('Error fetching prediction logs:', error)
      } else if (data && active) {
        // Balik array agar berurutan dari waktu terawal ke masa depan
        setLogs(data.reverse())
      }
      if (active) setLoading(false)
    }

    fetchLogs()

    const channel = supabase
      .channel(`prediction-logs-${deviceId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'prediction_logs', filter: `device_id=eq.${deviceId}` },
        () => fetchLogs()
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channel)
    }
  }, [deviceId])

  if (loading) {
    return (
      <div className="flex justify-center p-8 bg-gray-50/50 border-t border-gray-100">
        <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 text-sm bg-gray-50/50 border-t border-gray-100">
        Belum ada log prediksi untuk perangkat ini.
      </div>
    )
  }

  // Format data untuk Recharts
  const chartData = logs.map(log => {
    const dt = parseISO(log.target_timestamp)
    return {
      time: format(dt, 'HH:mm'),
      dateFull: format(dt, 'dd MMM yyyy HH:mm'),
      R: Number(log.pred_r),
      S: Number(log.pred_s),
      T: Number(log.pred_t),
    }
  })

  return (
    <div className="border-t border-gray-100 bg-gray-50/50 flex flex-col">
      {/* Metrik Evaluasi Model */}
      <div className="p-5 border-b border-gray-200">
        <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Info size={16} className="text-blue-500" />
          Model Evaluation Metrics (Random Forest)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Accuracy</span>
            <span className="text-2xl font-black text-gray-800">98.50<span className="text-sm text-gray-400 font-medium">%</span></span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-sm flex flex-col ring-1 ring-blue-50">
            <span className="text-xs font-semibold text-blue-600 mb-1 uppercase tracking-wider">F1-Score</span>
            <span className="text-2xl font-black text-blue-700">97.78<span className="text-sm text-blue-400 font-medium">%</span></span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Precision</span>
            <span className="text-2xl font-black text-gray-800">98.12<span className="text-sm text-gray-400 font-medium">%</span></span>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <span className="text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wider">Recall</span>
            <span className="text-2xl font-black text-gray-800">97.45<span className="text-sm text-gray-400 font-medium">%</span></span>
          </div>
        </div>
      </div>

      {/* Grafik Prediksi 24 Jam */}
      <div className="p-5 border-b border-gray-200">
        <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Info size={16} className="text-blue-500" />
          Grafik Prediksi 24 Jam Ke Depan
        </h4>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorS" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97706" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorT" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={false} 
                tickLine={false} 
                dy={10} 
              />
              <YAxis 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={false} 
                tickLine={false} 
              />
              <Tooltip 
                contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelFormatter={(label, payload) => payload?.[0]?.payload?.dateFull || label}
                formatter={(value: any) => [`${Number(value).toFixed(2)} mA`]}
              />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, marginTop: 10 }} />
              <Area type="monotone" name="Prediksi R" dataKey="R" stroke="#ef4444" fillOpacity={1} fill="url(#colorR)" strokeWidth={2} strokeDasharray="4 4" />
              <Area type="monotone" name="Prediksi S" dataKey="S" stroke="#d97706" fillOpacity={1} fill="url(#colorS)" strokeWidth={2} strokeDasharray="4 4" />
              <Area type="monotone" name="Prediksi T" dataKey="T" stroke="#3b82f6" fillOpacity={1} fill="url(#colorT)" strokeWidth={2} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabel Log Prediksi */}
      <div className="p-5">
        <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Info size={16} className="text-blue-500" />
          Detail Log Prediksi ML
        </h4>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase font-semibold sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3">Waktu Target</th>
                  <th className="px-4 py-3">R (mA)</th>
                  <th className="px-4 py-3">S (mA)</th>
                  <th className="px-4 py-3">T (mA)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => {
                  const isCrit = log.rf_status === 'Critical'
                  const isWarn = log.rf_status === 'Warning'
                  const statusColor = isCrit ? 'text-red-600 bg-red-50 border-red-200' : isWarn ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : 'text-green-600 bg-green-50 border-green-200'
                  const Icon = isCrit ? AlertCircle : isWarn ? AlertCircle : CheckCircle

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">
                        {format(parseISO(log.target_timestamp), 'dd MMM, HH:mm')}
                      </td>
                      <td className="px-4 py-3 font-semibold text-red-600/80">{log.pred_r.toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-amber-600/80">{log.pred_s.toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-blue-600/80">{log.pred_t.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-wider ${statusColor}`}>
                          <Icon size={12} />
                          {log.rf_status}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-700">
                        {log.confidence ? `${log.confidence.toFixed(1)}%` : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
