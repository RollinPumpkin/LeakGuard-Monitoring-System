'use client'

import React, { useEffect, useState } from 'react'
import { DeviceWithLatest, SensorReading } from '@/types'
import { supabase } from '@/lib/supabase'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { X, TrendingUp, Table as TableIcon, Download, Battery, Wifi } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
  device: DeviceWithLatest | null
  onClose: () => void
}

export function HealthDetailModal({ device, onClose }: Props) {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart')
  const { t, language } = useLanguage()

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

  const chartData = readings.map((rd) => ({
    time: format(parseISO(rd.timestamp), 'HH:mm', { locale: language === 'id' ? idLocale : enUS }),
    date: format(parseISO(rd.timestamp), 'dd MMM yyyy', { locale: language === 'id' ? idLocale : enUS }),
    battery_percent: Number(rd.battery_percent ?? 0),
    battery_v: Number(rd.battery_v ?? 0).toFixed(2),
    wifi_rssi: Number(rd.wifi_rssi ?? 0),
    sys_ok: (rd.system_status ?? 0) === 1 ? 'OK' : 'Error'
  }))

  const handleExportCSV = () => {
    const headers = [t('date'), t('time'), `${t('battery')} (%)`, `${t('battery')} (V)`, 'WiFi RSSI (dBm)', t('system_status')]
    const rows = chartData.map(d => [d.date, d.time, d.battery_percent, d.battery_v, d.wifi_rssi, d.sys_ok])
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `status-alat-${device.device_id}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('history_device_status')}: {device.device_id}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('telemetry_log_history')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('chart')}
                className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'chart'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TrendingUp size={16} /> {t('telemetry_chart')}
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'table'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TableIcon size={16} /> {t('history_log')}
              </button>
            </nav>
          </div>

          {activeTab === 'chart' && (
            <div className="space-y-6">
              {loading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Battery size={15} /> {t('battery_capacity')} (%)
                    </h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={24} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Line type="monotone" dataKey="battery_percent" name={`${t('battery')} (%)`} stroke="#22c55e" strokeWidth={2} dot={true} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Wifi size={15} /> {t('wifi_signal')} (dBm)
                    </h3>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={24} />
                        <YAxis domain={['auto', 0]} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Line type="stepAfter" dataKey="wifi_rssi" name="WiFi RSSI" stroke="#3b82f6" strokeWidth={2} dot={true} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'table' && (
            <div>
              <div className="flex justify-end mb-3">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Download size={14} /> {t('export_csv')}
                </button>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{t('time')}</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">{t('battery')} (%)</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">{t('voltage')} (V)</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">WiFi RSSI</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">{t('system')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {chartData.map((d, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{d.date} {d.time}</td>
                        <td className="px-4 py-2 text-right font-medium text-green-600">{d.battery_percent}%</td>
                        <td className="px-4 py-2 text-right text-gray-600">{d.battery_v} V</td>
                        <td className="px-4 py-2 text-right font-medium text-blue-600">{d.wifi_rssi} dBm</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${d.sys_ok === 'OK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {d.sys_ok}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {chartData.length === 0 && !loading && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-gray-400 text-xs">{t('no_data')}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
