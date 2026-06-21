'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { SensorReading } from '@/types'
import { useThresholds } from '@/components/ThresholdProvider'
import { computeAlarmStatus } from '@/lib/leak'
import { Bell, AlertTriangle, XCircle, Filter } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'

interface AlertItem extends SensorReading {
  status: 'Warning' | 'Critical'
  device_id: string
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const { thresholds } = useThresholds()
  const { t, language } = useLanguage()
  const supabase = createClient()
  const locale = language === 'id' ? idLocale : enUS

  useEffect(() => {
    let active = true
    const fetchAlerts = async () => {
      setLoading(true)
      const limitDate = new Date()
      limitDate.setDate(limitDate.getDate() - 30)
      
      const { data, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .gte('timestamp', limitDate.toISOString())
        .order('timestamp', { ascending: false })
        .limit(3000)

      if (!active) return
      
      if (data && !error) {
        const filteredAlerts: AlertItem[] = []
        for (const rd of data as SensorReading[]) {
          const status = computeAlarmStatus(rd, thresholds)
          if (status !== 'Normal') {
            filteredAlerts.push({ ...rd, status })
          }
        }
        setAlerts(filteredAlerts)
      }
      setLoading(false)
    }

    if (thresholds.warning > 0) {
      fetchAlerts()
    }
    return () => { active = false }
  }, [supabase, thresholds])

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
            <Filter size={16} />
            <span>Menampilkan data 30 hari terakhir</span>
          </div>
          <div className="text-sm font-medium">
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {alerts.map((alert, idx) => (
                  <tr key={idx} className="hover:bg-red-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="font-medium text-gray-900">{format(parseISO(alert.timestamp), 'dd MMM yyyy', { locale })}</div>
                      <div className="text-xs text-gray-500">{format(parseISO(alert.timestamp), 'HH:mm:ss', { locale })}</div>
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
                      {alert.r1}/{alert.r2}/{alert.r3}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {alert.s1}/{alert.s2}/{alert.s3}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {alert.t1}/{alert.t2}/{alert.t3}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
