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
import { deleteDevice } from '@/lib/data'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Brush
} from 'recharts'
import { TrendingUp, Zap, Table as TableIcon, Download, BarChart2, Trash2 } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as idLocale, enUS } from 'date-fns/locale'
import { useLanguage } from '@/contexts/LanguageContext'

interface Props {
  device: DeviceWithLatest
  onDeleted: () => void
}

export function SingleTrafoDashboard({ device, onDeleted }: Props) {
  const { thresholds } = useThresholds()
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart')
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const [selectedView, setSelectedView] = useState<'average' | 'R' | 'S' | 'T'>('average')
  const [timeFilter, setTimeFilter] = useState<'week' | 'month'>('week')
  const [isDeleting, setIsDeleting] = useState(false)
  const { t, language } = useLanguage()

  useEffect(() => {
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
        .eq('device_id', device.device_id)
        .gte('timestamp', dateLimit.toISOString())
        .order('timestamp', { ascending: false })
        .limit(2000)
      if (!active) return
      if (!error && data) setReadings((data as SensorReading[]).reverse())
      setLoading(false)
    })()
    return () => { active = false }
  }, [device.device_id, timeFilter])

  const handleDelete = async () => {
    if (!window.confirm(t('confirm_delete'))) return
    
    setIsDeleting(true)
    const { error } = await deleteDevice(device.device_id)
    if (!error) {
      alert(t('trafo_deleted'))
      onDeleted()
    } else {
      alert(error)
      setIsDeleting(false)
    }
  }

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
        R: Number(toMilliAmp((Number(rd.r1) + Number(rd.r2) + Number(rd.r3)) / 3).toFixed(2)),
        S: Number(toMilliAmp((Number(rd.s1) + Number(rd.s2) + Number(rd.s3)) / 3).toFixed(2)),
        T: Number(toMilliAmp((Number(rd.t1) + Number(rd.t2) + Number(rd.t3)) / 3).toFixed(2)),
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
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-gray-100 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
            {t('detail_trafo')} {device.device_id}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {t('detail_desc')}
          </p>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <Trash2 size={16} />
          {isDeleting ? t('loading') : t('delete_trafo')}
        </button>
      </div>

      <div className="p-6 space-y-8">
        {/* Metric Cards - Inspired by SmartAlert */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Rata-rata Arus (Total Konsumsi equivalent) */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-gray-500">Rata-rata Arus (RST)</p>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-600">
                LATEST
              </span>
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-gray-900">
                {r ? ((phaseEmaAvg(r, 'R') + phaseEmaAvg(r, 'S') + phaseEmaAvg(r, 'T')) / 3 * 1000).toFixed(1) : '0'}
              </h3>
              <p className="text-sm text-gray-500 mb-1">mA</p>
            </div>
          </div>

          {/* Card 2: Arus Maksimal (Peak Demand equivalent) */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-gray-500">Arus Puncak (Max)</p>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-50 text-gray-600">
                TODAY
              </span>
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-gray-900">
                {r ? (Math.max(phaseEmaAvg(r, 'R'), phaseEmaAvg(r, 'S'), phaseEmaAvg(r, 'T')) * 1000).toFixed(1) : '0'}
              </h3>
              <p className="text-sm text-gray-500 mb-1">mA</p>
            </div>
          </div>

          {/* Card 3: Status Trafo (Efficiency Score equivalent) */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-gray-500">Status Operasional</p>
              <span className="text-gray-400">•••</span>
            </div>
            <div className="flex items-center h-full mt-2">
              <StatusBadge status={status} size="md" />
            </div>
          </div>

          {/* Card 4: Tegangan Baterai (Occupancy equivalent) */}
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-gray-500">Tegangan Sistem</p>
              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-50 text-green-600">
                OK
              </span>
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-gray-900">
                {r?.battery_v ? Number(r.battery_v).toFixed(1) : '—'}
              </h3>
              <p className="text-sm text-gray-500 mb-1">V</p>
            </div>
          </div>
        </div>

        {/* Analisis Detail (RST Per Fasa & Prediksi) */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Perbandingan Beban Fasa (RST)</h3>
              <span className="text-xs text-gray-500">Real-time Data</span>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {PHASES.map((phase) => {
                const avg = r ? phaseEmaAvg(r, phase) : 0
                const sensors = r ? phaseEma(r, phase) : [0,0,0]
                const maxSensor = Math.max(...sensors) * 1000
                return (
                <div
                  key={phase}
                  onClick={() => setSelectedView(selectedView === phase ? 'average' : phase)}
                  className={`rounded-xl p-5 border text-center cursor-pointer transition-all ${
                    selectedView === phase 
                      ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-200' 
                      : 'bg-white border-gray-200 hover:border-blue-200 shadow-sm'
                  }`}
                >
                  <p className={`text-sm font-bold mb-2 ${phaseColor[phase]}`}>
                    FASA {phase}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <p className="text-2xl font-bold text-gray-900">
                      {(avg * 1000).toFixed(1)}
                    </p>
                    <span className="text-xs text-gray-500 font-medium">mA</span>
                  </div>
                  <div className="mt-3 text-left">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">Detail Sensor</p>
                    <div className="flex justify-between items-center bg-gray-50 px-2 py-1.5 rounded text-xs text-gray-600 border border-gray-100">
                      <span>{sensors.map(v => (v*1000).toFixed(0)).join(' • ')}</span>
                      <span className="font-medium text-gray-900">Max: {maxSensor.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
              )})}
            </div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Behavior Prediction</h3>
            </div>
            <div className="rounded-xl p-5 border bg-white border-gray-200 shadow-sm flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-50 rounded-lg">
                  <Zap size={20} className="text-blue-600" />
                </div>
                <span className="text-sm font-bold text-gray-900 leading-tight">
                  Random Forest<br/>Analysis
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-sm font-medium text-gray-800 mb-1">
                  {device.latest_prediction?.rf_status || 'Normal'}
                </p>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {device.latest_prediction?.action || 'Pola konsumsi energi normal, tidak terdeteksi anomali.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs untuk Grafik dan Tabel */}
        <div className="border-t border-gray-100 pt-8">
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('chart')}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'chart'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TrendingUp size={18} /> {t('trend_chart')}
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'table'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <TableIcon size={18} /> {t('history_log')}
              </button>
            </nav>
          </div>

          {activeTab === 'chart' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-500" />
                  {t('leak_trend_ema')} ({selectedView === 'average' ? 'Average' : `${t('phase')} ${selectedView}`}) (mA)
                </h3>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setTimeFilter('week')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFilter === 'week' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {t('week')}
                    </button>
                    <button
                      onClick={() => setTimeFilter('month')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFilter === 'month' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {t('month')}
                    </button>
                  </div>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setChartType('line')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${chartType === 'line' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <TrendingUp size={14} /> Line
                    </button>
                    <button
                      onClick={() => setChartType('bar')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors ${chartType === 'bar' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <BarChart2 size={14} /> Bar
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="h-72 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
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
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => [`${Number(value ?? 0)} mA`]} labelFormatter={(label) => `${t('time')}: ${label}`} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, marginTop: 10 }} />
                      {selectedView === 'average' ? (
                        <>
                          <Area type="monotone" name="R" dataKey="R" stroke="#ef4444" fillOpacity={1} fill="url(#colorRModal)" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                          <Area type="monotone" name="S" dataKey="S" stroke="#eab308" fillOpacity={1} fill="url(#colorSModal)" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                          <Area type="monotone" name="T" dataKey="T" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTModal)" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                        </>
                      ) : (
                        <>
                          <Area type="monotone" name={`${selectedView}1`} dataKey={`${selectedView}1`} stroke="#ef4444" fillOpacity={1} fill="url(#colorRModal)" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                          <Area type="monotone" name={`${selectedView}2`} dataKey={`${selectedView}2`} stroke="#eab308" fillOpacity={1} fill="url(#colorSModal)" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                          <Area type="monotone" name={`${selectedView}3`} dataKey={`${selectedView}3`} stroke="#3b82f6" fillOpacity={1} fill="url(#colorTModal)" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                        </>
                      )}
                      <Brush dataKey="time" height={30} stroke="#cbd5e1" travellerWidth={12} y={320} fill="#f8fafc" />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={24} />
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
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex justify-end mb-4">
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Download size={16} /> {t('export_csv')}
                </button>
              </div>
              <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('time')}</th>
                      {selectedView === 'average' ? (
                        <>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">R (mA)</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">S (mA)</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">T (mA)</th>
                        </>
                      ) : (
                        <>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{selectedView}1 (mA)</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{selectedView}2 (mA)</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{selectedView}3 (mA)</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {chartData.map((d: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{d.date} {d.time}</td>
                        {selectedView === 'average' ? (
                          <>
                            <td className="px-6 py-3 text-right font-medium text-red-600">{d.R}</td>
                            <td className="px-6 py-3 text-right font-medium text-yellow-600">{d.S}</td>
                            <td className="px-6 py-3 text-right font-medium text-blue-600">{d.T}</td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-3 text-right font-medium text-red-600">{d[`${selectedView}1`]}</td>
                            <td className="px-6 py-3 text-right font-medium text-yellow-600">{d[`${selectedView}2`]}</td>
                            <td className="px-6 py-3 text-right font-medium text-blue-600">{d[`${selectedView}3`]}</td>
                          </>
                        )}
                      </tr>
                    ))}
                    {chartData.length === 0 && !loading && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400 text-sm">{t('no_data')}</td>
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
