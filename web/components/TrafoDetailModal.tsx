'use client'

import React, { useEffect, useState } from 'react'
import { DeviceWithLatest, SensorReading } from '@/types'
import { StatusBadge } from './StatusBadge'
import { useThresholds } from './ThresholdProvider'
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
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush
} from 'recharts'
import { X, TrendingUp, Zap, Table as TableIcon, Download, BarChart2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
  device: DeviceWithLatest | null
  onClose: () => void
}

export function TrafoDetailModal({ device, onClose }: Props) {
  const { thresholds } = useThresholds()
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart')
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [selectedView, setSelectedView] = useState<'average' | 'R' | 'S' | 'T'>('average')
  const [timeFilter, setTimeFilter] = useState<'week' | 'month'>('week')
  const { t, language } = useLanguage()

  useEffect(() => {
    if (!device) return
    let active = true
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
        .eq('device_id', device.device_id)
        .gte('timestamp', dateLimit.toISOString())
        .order('timestamp', { ascending: false })
        .limit(2000)
      if (!active) return
      if (!error && data) setReadings((data as SensorReading[]).reverse())
      setLoading(false)
    })()
    return () => { active = false }
  }, [device, timeFilter])

  if (!device) return null

  const r = device.latest_reading
  const status = computeAlarmStatus(r, thresholds)

  const chartData = readings.map((rd) => {
    const base = {
      time: format(parseISO(rd.timestamp), 'HH:mm:ss', { locale: language === 'id' ? idLocale : enUS }),
      date: format(parseISO(rd.timestamp), 'dd MMM yyyy', { locale: language === 'id' ? idLocale : enUS }),
    }
    if (selectedView === 'average') {
      return {
        ...base,
        R: Number(toMilliAmp(phaseEmaAvg(rd, 'R')).toFixed(2)),
        S: Number(toMilliAmp(phaseEmaAvg(rd, 'S')).toFixed(2)),
        T: Number(toMilliAmp(phaseEmaAvg(rd, 'T')).toFixed(2)),
      }
    } else {
      const p = selectedView.toLowerCase()
      return {
        ...base,
        [`${selectedView}1`]: Number(toMilliAmp(Number(rd[`${p}1` as keyof SensorReading])).toFixed(2)),
        [`${selectedView}2`]: Number(toMilliAmp(Number(rd[`${p}2` as keyof SensorReading])).toFixed(2)),
        [`${selectedView}3`]: Number(toMilliAmp(Number(rd[`${p}3` as keyof SensorReading])).toFixed(2)),
      }
    }
  })

  const handleExportCSV = () => {
    const isAvg = selectedView === 'average'
    const headers = isAvg 
      ? ['Tanggal', 'Waktu', 'Fasa R (mA)', 'Fasa S (mA)', 'Fasa T (mA)']
      : ['Tanggal', 'Waktu', `${selectedView}1 (mA)`, `${selectedView}2 (mA)`, `${selectedView}3 (mA)`]
    
    const rows = chartData.map((d: any) => isAvg 
      ? [d.date, d.time, d.R, d.S, d.T]
      : [d.date, d.time, d[`${selectedView}1`], d[`${selectedView}2`], d[`${selectedView}3`]]
    )
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `arus-bocor-${device.device_id}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('detail_trafo')} {device.device_id}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('detail_desc')}
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
              { label: t('device_type'), value: device.device_type },
              { label: t('device_id'), value: device.device_id },
              { label: t('location'), value: device.location || '—' },
              { label: t('status'), value: status, badge: true },
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

          {/* Prediksi */}
          <div className="rounded-xl p-4 border bg-gray-50 border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} className="text-blue-600" />
              <span className="text-sm font-semibold text-gray-800">
                {t('rf_prediction')}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {device.latest_prediction?.rf_status
                ? `${device.latest_prediction.rf_status} — ${device.latest_prediction.action ?? ''}`
                : t('model_maintenance')}
            </p>
          </div>

          {/* Ringkasan EMA per fasa */}
          {r && (
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-3">
                {t('ema_summary')}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {PHASES.map((phase) => (
                  <div
                    key={phase}
                    onClick={() => setSelectedView(selectedView === phase ? 'average' : phase)}
                    className={`rounded-lg p-3 border text-center cursor-pointer transition-all ${
                      selectedView === phase 
                        ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-100' 
                        : 'bg-gray-50 border-gray-100 hover:border-blue-200'
                    }`}
                  >
                    <p className={`text-xs font-semibold mb-1 ${phaseColor[phase]}`}>
                      {t('phase')} {phase}
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

          {/* Tabs untuk Grafik dan Tabel */}
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('chart')}
                className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'chart'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TrendingUp size={16} /> {t('trend_chart')}
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
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                  <TrendingUp size={15} />
                  {t('leak_trend_ema')} ({selectedView === 'average' ? 'Average' : `${t('phase')} ${selectedView}`}) (mA)
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setTimeFilter('week')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeFilter === 'week' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {t('week')}
                    </button>
                    <button
                      onClick={() => setTimeFilter('month')}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${timeFilter === 'month' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {t('month')}
                    </button>
                  </div>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setChartType('line')}
                      className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${chartType === 'line' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <TrendingUp size={13} /> Line
                    </button>
                    <button
                      onClick={() => setChartType('bar')}
                      className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${chartType === 'bar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <BarChart2 size={13} /> Bar
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="h-48 flex items-center justify-center">
                  <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  {chartType === 'line' ? (
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 20 }}>
                      <defs>
                        <linearGradient id="colorRModal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorSModal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#eab308" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#eab308" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorTModal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis 
                        dataKey="time" 
                        tick={{ fontSize: 10, fill: '#64748b' }} 
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
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => [`${Number(value ?? 0)} mA`]} labelFormatter={(label) => `${t('time')}: ${label}`} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, marginTop: 10 }} />
                      {selectedView === 'average' ? (
                        <>
                          <Area type="monotone" name="R" dataKey="R" stroke="#ef4444" fillOpacity={1} fill="url(#colorRModal)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                          <Area type="monotone" name="S" dataKey="S" stroke="#eab308" fillOpacity={1} fill="url(#colorSModal)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                          <Area type="monotone" name="T" dataKey="T" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTModal)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                        </>
                      ) : (
                        <>
                          <Area type="monotone" name={`${selectedView}1`} dataKey={`${selectedView}1`} stroke="#ef4444" fillOpacity={1} fill="url(#colorRModal)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                          <Area type="monotone" name={`${selectedView}2`} dataKey={`${selectedView}2`} stroke="#eab308" fillOpacity={1} fill="url(#colorSModal)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                          <Area type="monotone" name={`${selectedView}3`} dataKey={`${selectedView}3`} stroke="#3b82f6" fillOpacity={1} fill="url(#colorTModal)" strokeWidth={2} dot={false} activeDot={{ r: 5 }} />
                        </>
                      )}
                      <Brush dataKey="time" height={30} stroke="#cbd5e1" travellerWidth={12} y={230} fill="#f8fafc" />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 10 }} minTickGap={24} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value) => [`${Number(value ?? 0)} mA`]} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                      {selectedView === 'average' ? (
                        <>
                          <Bar dataKey="R" fill="#ef4444" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="S" fill="#eab308" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="T" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                        </>
                      ) : (
                        <>
                          <Bar dataKey={`${selectedView}1`} fill="#ef4444" radius={[2, 2, 0, 0]} />
                          <Bar dataKey={`${selectedView}2`} fill="#eab308" radius={[2, 2, 0, 0]} />
                          <Bar dataKey={`${selectedView}3`} fill="#3b82f6" radius={[2, 2, 0, 0]} />
                        </>
                      )}
                      <Brush dataKey="time" height={30} stroke="#cbd5e1" travellerWidth={10} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
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
              <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">{t('time')}</th>
                      {selectedView === 'average' ? (
                        <>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">R (mA)</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">S (mA)</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">T (mA)</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">{selectedView}1 (mA)</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">{selectedView}2 (mA)</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">{selectedView}3 (mA)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {chartData.map((d: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{d.date} {d.time}</td>
                        {selectedView === 'average' ? (
                          <>
                            <td className="px-4 py-2 text-right font-medium text-red-600">{d.R}</td>
                            <td className="px-4 py-2 text-right font-medium text-yellow-600">{d.S}</td>
                            <td className="px-4 py-2 text-right font-medium text-blue-600">{d.T}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2 text-right font-medium text-red-600">{d[`${selectedView}1`]}</td>
                            <td className="px-4 py-2 text-right font-medium text-yellow-600">{d[`${selectedView}2`]}</td>
                            <td className="px-4 py-2 text-right font-medium text-blue-600">{d[`${selectedView}3`]}</td>
                          </>
                        )}
                      </tr>
                    ))}
                    {chartData.length === 0 && !loading && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-xs">{t('no_data')}</td>
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
