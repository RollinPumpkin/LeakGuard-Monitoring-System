'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { SensorReading, Alert } from '@/types'
import { useThresholds } from '@/components/ThresholdProvider'
import { Bell, AlertTriangle, XCircle, CheckCircle, Check } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'

interface AlertWithReading extends Alert {
  sensor_readings: SensorReading | null
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertWithReading[]>([])
  const [loading, setLoading] = useState(true)
  const { thresholds } = useThresholds()
  const { t, language } = useLanguage()
  const supabase = createClient()
  const locale = language === 'id' ? idLocale : enUS

  useEffect(() => {
    let active = true
    const fetchAlerts = async () => {
      setLoading(true)
      
      // Mengambil data dari tabel alerts dan join dengan sensor_readings
      const { data, error } = await supabase
        .from('alerts')
        .select('*, sensor_readings(*)')
        .order('created_at', { ascending: false })
        .limit(500)

      if (!active) return
      
      if (data && !error) {
        setAlerts(data as AlertWithReading[])
      }
      setLoading(false)
    }

    fetchAlerts()
    return () => { active = false }
  }, [supabase])

  const handleResolve = async (id: number) => {
    // Optimistic UI update
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a))
    
    // Update Supabase (di tabel alerts)
    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', id)
      
    if (error) {
      console.error('Error resolving alert:', error)
      // Revert if error
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: false } : a))
    }
  }

  const renderSensorValue = (val: number | null | undefined) => {
    if (val == null) return <span className="text-gray-400">-</span>
    const numVal = Number(val)
    let statusClass = 'text-gray-600'
    if (numVal >= thresholds.critical) {
      statusClass = 'font-bold text-red-700 bg-red-100 border border-red-300 rounded px-1.5 py-0.5'
    } else if (numVal >= thresholds.warning) {
      statusClass = 'font-bold text-yellow-700 bg-yellow-100 border border-yellow-400 rounded px-1.5 py-0.5'
    }
    return <span className={statusClass}>{numVal}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="text-red-500" />
            Notifikasi & Alert
          </h1>
          <p className="text-sm text-gray-500 mt-1">Riwayat anomali dan kebocoran arus di atas ambang batas normal.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>Daftar Insiden Kebocoran Terakhir</span>
          </div>
          <div className="text-sm font-medium text-gray-700">
            Total: <span className="text-red-600 font-bold">{alerts.length}</span> Alerts
          </div>
        </div>

        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-gray-400">
            <Bell size={48} className="mb-4 opacity-20" />
            <p>Tidak ada riwayat alert. Semua trafo beroperasi normal.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Waktu</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Perangkat</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">R1/R2/R3</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">S1/S2/S3</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">T1/T2/T3</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {alerts.map((alert, idx) => {
                  const rd = alert.sensor_readings
                  const alertTime = rd ? rd.timestamp : alert.created_at
                  return (
                  <tr key={idx} className={`transition-colors ${alert.is_read ? 'bg-gray-50/50 opacity-70' : 'hover:bg-red-50/50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="font-medium text-gray-900">{format(parseISO(alertTime), 'dd MMM yyyy', { locale })}</div>
                      <div className="text-xs text-gray-500">{format(parseISO(alertTime), 'HH:mm:ss', { locale })}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      Trafo {alert.device_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                        alert.status === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {alert.status === 'Critical' ? <XCircle size={14} /> : <AlertTriangle size={14} />}
                        {alert.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        {renderSensorValue(rd?.r1)} <span className="text-gray-400">/</span>
                        {renderSensorValue(rd?.r2)} <span className="text-gray-400">/</span>
                        {renderSensorValue(rd?.r3)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        {renderSensorValue(rd?.s1)} <span className="text-gray-400">/</span>
                        {renderSensorValue(rd?.s2)} <span className="text-gray-400">/</span>
                        {renderSensorValue(rd?.s3)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        {renderSensorValue(rd?.t1)} <span className="text-gray-400">/</span>
                        {renderSensorValue(rd?.t2)} <span className="text-gray-400">/</span>
                        {renderSensorValue(rd?.t3)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {alert.is_read ? (
                        <span className="inline-flex items-center gap-1.5 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg text-xs font-semibold border border-green-200">
                          <CheckCircle size={14} /> Terselesaikan
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleResolve(alert.id)}
                          className="inline-flex items-center gap-1.5 bg-gray-900 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                        >
                          <Check size={14} /> Selesaikan
                        </button>
                      )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
