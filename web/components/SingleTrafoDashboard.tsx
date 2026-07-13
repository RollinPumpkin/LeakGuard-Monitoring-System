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
import { deleteDevice, updateDeviceName } from '@/lib/data'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceArea
} from 'recharts'
import { TrendingUp, Zap, Table as TableIcon, Download, BarChart2, Trash2, Edit2, Check, X } from 'lucide-react'
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
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month'>('week')
  const [isDeleting, setIsDeleting] = useState(false)
  
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState(device.description || `Trafo ${device.device_id}`)
  const [isSavingName, setIsSavingName] = useState(false)
  const [forecastData, setForecastData] = useState<any>(null)
  const { t, language } = useLanguage()

  // Zoom State
  const [zoomRange, setZoomRange] = useState<{start: number, end: number} | null>(null)
  const [refAreaLeft, setRefAreaLeft] = useState<string | null>(null)
  const [refAreaRight, setRefAreaRight] = useState<string | null>(null)
  const [refAreaStartIndex, setRefAreaStartIndex] = useState<number | null>(null)
  const [refAreaEndIndex, setRefAreaEndIndex] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setZoomRange(null)
    ;(async () => {
      const dateLimit = new Date()
      if (timeFilter === 'day') {
        dateLimit.setHours(0, 0, 0, 0)
      } else if (timeFilter === 'week') {
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
      if (!error && data) {
        let rawReadings = (data as SensorReading[]).reverse()
        const filledReadings: SensorReading[] = []
        for (let i = 0; i < rawReadings.length; i++) {
          filledReadings.push(rawReadings[i])
          if (i < rawReadings.length - 1) {
            const current = rawReadings[i]
            const next = rawReadings[i + 1]
            const t1 = new Date(current.timestamp).getTime()
            const t2 = new Date(next.timestamp).getTime()
            const diffHours = (t2 - t1) / (1000 * 60 * 60)
            if (diffHours > 1.5) {
              const numMissing = Math.floor(diffHours)
              for (let j = 1; j < numMissing; j++) {
                 const newDate = new Date(t1 + j * 60 * 60 * 1000)
                 filledReadings.push({
                   ...current,
                   timestamp: newDate.toISOString()
                 })
              }
            }
          }
        }
        setReadings(filledReadings)
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [device.device_id, timeFilter])

  // Fetch forecast data whenever readings change
  useEffect(() => {
    if (readings.length > 0) {
      // Ambil histori (maksimal 10 jam terakhir)
      const recentReadings = readings.slice(-10)
      const historyR = recentReadings.map(rd => phaseEmaAvg(rd, 'R') * 1000)
      const historyS = recentReadings.map(rd => phaseEmaAvg(rd, 'S') * 1000)
      const historyT = recentReadings.map(rd => phaseEmaAvg(rd, 'T') * 1000)
      
      fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: device.device_id, history_r: historyR, history_s: historyS, history_t: historyT })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.result)) {
          const formattedForecast = data.result.map((item: any) => {
            const dt = parseISO(item.target_timestamp)
            return {
              time: format(dt, 'yyyy-MM-dd HH:mm:ss') + ' (Pred)',
              date: format(dt, 'dd MMM yyyy', { locale: language === 'id' ? idLocale : enUS }),
              R_pred: Number(item.pred_r),
              S_pred: Number(item.pred_s),
              T_pred: Number(item.pred_t),
              R_pred_range: [Number((item.pred_r * 0.92).toFixed(2)), Number((item.pred_r * 1.08).toFixed(2))],
              S_pred_range: [Number((item.pred_s * 0.92).toFixed(2)), Number((item.pred_s * 1.08).toFixed(2))],
              T_pred_range: [Number((item.pred_t * 0.92).toFixed(2)), Number((item.pred_t * 1.08).toFixed(2))],
              isForecast: true
            }
          })
          setForecastData(formattedForecast)
        }
      })
      .catch(err => console.error("Forecast Error:", err))
    }
  }, [readings, language, device.device_id])

  const handleDelete = async () => {
    const confirmationText = `DELETE TRAFO ${device.device_id}`
    const confirmation = prompt(`Ketik "${confirmationText}" untuk mengonfirmasi penghapusan:`)
    if (confirmation !== confirmationText) {
      alert('Penghapusan dibatalkan: teks tidak cocok.')
      return
    }
    
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

  const handleSaveName = async () => {
    setIsSavingName(true)
    const { error } = await updateDeviceName(device.device_id, editName)
    setIsSavingName(false)
    if (!error) {
      setIsEditingName(false)
      // Call refresh to update parent if necessary, but we can also just rely on state
      device.description = editName
    } else {
      alert(error)
    }
  }

  const r = device.latest_reading
  const status = computeAlarmStatus(r, thresholds)

  const todayStr = new Date().toISOString().split('T')[0]
  const todayReadings = readings.filter(rd => rd.timestamp.startsWith(todayStr))
  
  let maxToday = 0
  let maxChannel = ''

  const findMaxInReading = (rd: any) => {
    const channels = [
      { key: 'R1', val: rd.r1 }, { key: 'R2', val: rd.r2 }, { key: 'R3', val: rd.r3 },
      { key: 'S1', val: rd.s1 }, { key: 'S2', val: rd.s2 }, { key: 'S3', val: rd.s3 },
      { key: 'T1', val: rd.t1 }, { key: 'T2', val: rd.t2 }, { key: 'T3', val: rd.t3 },
    ];
    let mVal = 0;
    let mCh = '';
    channels.forEach(c => {
      const v = Number(c.val) || 0;
      if (v >= mVal) {
        mVal = v;
        mCh = c.key;
      }
    });
    return { mVal, mCh };
  }

  if (todayReadings.length > 0) {
    todayReadings.forEach(rd => {
      const { mVal, mCh } = findMaxInReading(rd);
      if (mVal >= maxToday) {
        maxToday = mVal;
        maxChannel = mCh;
      }
    });
  } else if (r) {
    const { mVal, mCh } = findMaxInReading(r);
    maxToday = mVal;
    maxChannel = mCh;
  }

  const baseChartData = readings.map((rd) => {
    const base = {
      time: format(parseISO(rd.timestamp), 'yyyy-MM-dd HH:mm:ss'),
      date: format(parseISO(rd.timestamp), 'dd MMM yyyy', { locale: language === 'id' ? idLocale : enUS }),
    }
    return {
      ...base,
      R: Number(toMilliAmp((Number(rd.r1) + Number(rd.r2) + Number(rd.r3)) / 3).toFixed(2)),
      S: Number(toMilliAmp((Number(rd.s1) + Number(rd.s2) + Number(rd.s3)) / 3).toFixed(2)),
      T: Number(toMilliAmp((Number(rd.t1) + Number(rd.t2) + Number(rd.t3)) / 3).toFixed(2)),
      R_pred: null,
      S_pred: null,
      T_pred: null,
      R_pred_range: null,
      S_pred_range: null,
      T_pred_range: null,
      r1: Number(toMilliAmp(Number(rd.r1)).toFixed(2)),
      r2: Number(toMilliAmp(Number(rd.r2)).toFixed(2)),
      r3: Number(toMilliAmp(Number(rd.r3)).toFixed(2)),
      s1: Number(toMilliAmp(Number(rd.s1)).toFixed(2)),
      s2: Number(toMilliAmp(Number(rd.s2)).toFixed(2)),
      s3: Number(toMilliAmp(Number(rd.s3)).toFixed(2)),
      t1: Number(toMilliAmp(Number(rd.t1)).toFixed(2)),
      t2: Number(toMilliAmp(Number(rd.t2)).toFixed(2)),
      t3: Number(toMilliAmp(Number(rd.t3)).toFixed(2)),
    }
  })

  // Tambahkan titik data prediksi di akhir chart
  const chartData = forecastData ? [...baseChartData, ...forecastData] : baseChartData
  const finalChartData = zoomRange ? chartData.slice(zoomRange.start, zoomRange.end + 1) : chartData

  // Zoom Handlers
  const handleMouseDown = (e: any) => {
    if (e && e.activeLabel) {
      setRefAreaLeft(e.activeLabel)
      setRefAreaStartIndex(e.activeTooltipIndex)
    }
  }

  const handleMouseMove = (e: any) => {
    if (e && e.activeLabel && refAreaLeft) {
      setRefAreaRight(e.activeLabel)
      setRefAreaEndIndex(e.activeTooltipIndex)
    }
  }

  const handleMouseUp = () => {
    if (typeof refAreaStartIndex !== 'number' || typeof refAreaEndIndex !== 'number') {
      setRefAreaLeft(null)
      setRefAreaRight(null)
      setRefAreaStartIndex(null)
      setRefAreaEndIndex(null)
      return
    }
    let start = refAreaStartIndex
    let end = refAreaEndIndex
    if (start > end) {
      [start, end] = [end, start]
    }
    if (end - start < 3) {
      setRefAreaLeft(null)
      setRefAreaRight(null)
      setRefAreaStartIndex(null)
      setRefAreaEndIndex(null)
      return
    }
    const absoluteStart = zoomRange ? zoomRange.start + start : start
    const absoluteEnd = zoomRange ? zoomRange.start + end : end
    
    // Ensure we don't go out of bounds (just in case)
    const validStart = Math.max(0, absoluteStart)
    const validEnd = Math.min(chartData.length - 1, absoluteEnd)

    setZoomRange({ start: validStart, end: validEnd })
    setRefAreaLeft(null)
    setRefAreaRight(null)
    setRefAreaStartIndex(null)
    setRefAreaEndIndex(null)
  }

  const handleZoomOut = () => {
    setZoomRange(null)
  }

  // Label rentang zoom ala Steam Market
  let zoomLabel = ''
  if (zoomRange && chartData[zoomRange.start] && chartData[zoomRange.end]) {
    const sData = chartData[zoomRange.start]
    const eData = chartData[zoomRange.end]
    const sTime = sData.time.replace(' (Pred)', '')
    const eTime = eData.time.replace(' (Pred)', '')
    zoomLabel = `${sTime} - ${eTime}`
  }

  const handleExportCSV = () => {
    const headers = ['Tanggal', 'Waktu', 'Avg R', 'Avg S', 'Avg T', 'R1', 'R2', 'R3', 'S1', 'S2', 'S3', 'T1', 'T2', 'T3']
    const rows = chartData.map((d: any) => 
      [d.date, d.time, d.R, d.S, d.T, d.r1, d.r2, d.r3, d.s1, d.s2, d.s3, d.t1, d.t2, d.t3]
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

  const formatXAxis = (val: string) => {
    const isPred = val.includes('(Pred)')
    const cleanVal = val.replace(' (Pred)', '')
    let formatted = cleanVal
    try {
      const d = parseISO(cleanVal.replace(' ', 'T'))
      if (timeFilter === 'day') {
        formatted = format(d, 'HH:mm', { locale: language === 'id' ? idLocale : enUS })
      } else if (timeFilter === 'week') {
        formatted = format(d, 'EEEE', { locale: language === 'id' ? idLocale : enUS })
      } else if (timeFilter === 'month') {
        formatted = format(d, 'dd MMM', { locale: language === 'id' ? idLocale : enUS })
      }
    } catch (e) {
      formatted = cleanVal.split(' ')[1] || cleanVal
    }
    return isPred ? `${formatted} (Pred)` : formatted
  }

  // Get exactly one tick per day for week/month views to prevent duplicates
  const customTicks = React.useMemo(() => {
    if (timeFilter === 'day') return undefined
    const ticks: string[] = []
    let lastDate = ''
    finalChartData.forEach((d: any) => {
      if (d.date !== lastDate) {
        ticks.push(d.time)
        lastDate = d.date
      }
    })
    return ticks
  }, [finalChartData, timeFilter])

  const renderChart = (title: string, dataKeys: {key: string, color: string, name: string}[], syncId?: string) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h3 className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <TrendingUp size={18} className="text-blue-500" />
          {title}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          {!syncId && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTimeFilter('day')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFilter === 'day' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Daily
              </button>
              <button
                onClick={() => setTimeFilter('week')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFilter === 'week' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t('week') || 'Week'}
              </button>
              <button
                onClick={() => setTimeFilter('month')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${timeFilter === 'month' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {t('month')}
              </button>
            </div>
          )}
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
          {zoomRange && (
            <button
              onClick={handleZoomOut}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-gray-700 text-gray-100 hover:bg-gray-800 rounded-md transition-colors shadow-sm"
              title="Reset Zoom"
            >
              {zoomLabel} <X size={14} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="h-72 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={syncId ? 250 : 350}>
          {chartType === 'line' ? (
            <AreaChart 
              data={finalChartData} 
              syncId={syncId} 
              margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="select-none"
            >
              <defs>
                {dataKeys.map(dk => (
                  <linearGradient key={dk.key} id={`color_${dk.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={dk.color} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={dk.color} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                minTickGap={15} 
                ticks={timeFilter !== 'day' ? customTicks : undefined}
                axisLine={false}
                tickLine={false}
                dy={10}
                tickFormatter={formatXAxis}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: '#64748b' }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip itemSorter={(item) => -(Number(item.value) || 0)} contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => value != null ? [`${Number(value).toFixed(1)} mA`] : []} labelStyle={{ color: '#64748b', fontWeight: 600, marginBottom: 4 }} labelFormatter={(label) => label} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, marginTop: 10 }} />
              {dataKeys.map(dk => (
                <Area key={dk.key} type="monotone" name={dk.name} dataKey={dk.key} stroke={dk.color} fillOpacity={1} fill={`url(#color_${dk.key})`} strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
              ))}
              {/* Tambahan garis putus-putus untuk prediksi */}
              {dataKeys.map(dk => (
                <Area key={`${dk.key}_pred_range`} legendType="none" type="monotone" tooltipType="none" dataKey={`${dk.key}_pred_range`} stroke="none" fill={dk.color} fillOpacity={0.15} activeDot={false} />
              ))}
              {dataKeys.map(dk => (
                <Area key={`${dk.key}_pred`} legendType="none" type="monotone" name={`${dk.name} (Prediksi 1 Jam)`} dataKey={`${dk.key}_pred`} stroke={dk.color} fill="transparent" strokeWidth={2.5} strokeDasharray="5 5" dot={false} activeDot={{ r: 6 }} />
              ))}
              {refAreaLeft && refAreaRight ? (
                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#60a5fa" fillOpacity={0.2} />
              ) : null}
            </AreaChart>
          ) : (
            <BarChart 
              data={finalChartData} 
              syncId={syncId}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="select-none"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 11 }} 
                minTickGap={15} 
                ticks={timeFilter !== 'day' ? customTicks : undefined}
                tickFormatter={formatXAxis}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip itemSorter={(item) => -(Number(item.value) || 0)} contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(value) => [`${Number(value ?? 0)} mA`]} labelStyle={{ color: '#64748b', fontWeight: 600, marginBottom: 4 }} labelFormatter={(label) => label} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              {dataKeys.map(dk => (
                <Bar key={dk.key} dataKey={dk.key} fill={dk.color} radius={[2, 2, 0, 0]} name={dk.name} />
              ))}
              {refAreaLeft && refAreaRight ? (
                <ReferenceArea x1={refAreaLeft} x2={refAreaRight} strokeOpacity={0.3} fill="#60a5fa" fillOpacity={0.2} />
              ) : null}
            </BarChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  )
  
  const lastUpdateBadge = r?.timestamp 
    ? <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500 whitespace-nowrap border border-gray-200">{format(parseISO(r.timestamp), 'dd MMM yyyy, HH:mm:ss', { locale: language === 'id' ? idLocale : enUS })}</span>
    : null

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mt-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-gray-100 gap-4">
        <div>
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-xl font-semibold text-gray-900 border border-blue-300 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button onClick={handleSaveName} disabled={isSavingName} className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors">
                <Check size={18} />
              </button>
              <button onClick={() => { setIsEditingName(false); setEditName(device.description || `Trafo ${device.device_id}`); }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
                <X size={18} />
              </button>
            </div>
          ) : (
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
              {device.description || `Trafo ${device.device_id}`}
              <button onClick={() => setIsEditingName(true)} className="p-1 text-gray-400 hover:text-blue-600 transition-colors">
                <Edit2 size={16} />
              </button>
            </h2>
          )}
          <p className="text-sm text-gray-500 mt-0.5">
            {t('detail_desc')} (ID: {device.device_id})
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
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-gray-500">Rata-rata Arus (RST)</p>
              {lastUpdateBadge}
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-gray-900">
                {r ? ((phaseEmaAvg(r, 'R') + phaseEmaAvg(r, 'S') + phaseEmaAvg(r, 'T')) / 3 * 1000).toFixed(1) : '0'}
              </h3>
              <p className="text-sm text-gray-500 mb-1">mA</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-gray-500">Arus Puncak (Max)</p>
              {lastUpdateBadge}
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-gray-900">
                {(maxToday * 1000).toFixed(1)}
              </h3>
              <p className="text-sm text-gray-500 mb-1">mA <span className="font-semibold text-gray-600">{maxChannel ? `(${maxChannel})` : ''}</span></p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-gray-500">Status Operasional</p>
              {lastUpdateBadge}
            </div>
            <div className="flex items-center h-full mt-2">
              <StatusBadge status={status} size="md" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <p className="text-sm font-medium text-gray-500">Status Baterai</p>
              <div className="flex gap-2 items-center">
                {lastUpdateBadge}
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-600">OK</span>
              </div>
            </div>
            <div className="flex items-end gap-2">
              <h3 className="text-3xl font-bold text-gray-900">
                {r?.battery_v ? Number(r.battery_v).toFixed(1) : '—'}
              </h3>
              <p className="text-sm text-gray-500 mb-1">V</p>
            </div>
          </div>
        </div>

        {/* Analisis Detail */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-800">Perbandingan Beban Fasa (RST)</h3>
              {lastUpdateBadge}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {PHASES.map((phase) => {
                const avg = r ? phaseEmaAvg(r, phase) : 0
                const sensors = r ? phaseEma(r, phase) : [0,0,0]
                const maxSensorValue = Math.max(...sensors) * 1000
                const maxSensorIndex = sensors.findIndex(v => v * 1000 === maxSensorValue)
                const maxSensorName = `${phase}${maxSensorIndex + 1}`
                return (
                <div key={phase} className="rounded-xl p-5 border bg-white border-gray-200 shadow-sm text-center flex flex-col justify-between">
                  <div>
                    <p className={`text-sm font-bold mb-2 ${phaseColor[phase]}`}>FASA {phase}</p>
                    <div className="flex items-baseline justify-center gap-1">
                      <p className="text-2xl font-bold text-gray-900">{(avg * 1000).toFixed(1)}</p>
                      <span className="text-xs text-gray-500 font-medium">mA</span>
                    </div>
                  </div>
                  <div className="mt-4 text-left">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Detail Sensor</p>
                    <div className="flex flex-col gap-1.5 bg-gray-50 px-2.5 py-2 rounded-lg text-[11px] text-gray-500 border border-gray-100">
                      <div className="flex justify-between items-center px-1">
                        <span>{phase}1: <strong className="text-gray-800 font-semibold">{(sensors[0]*1000).toFixed(0)}</strong></span>
                        <span className="text-gray-300">•</span>
                        <span>{phase}2: <strong className="text-gray-800 font-semibold">{(sensors[1]*1000).toFixed(0)}</strong></span>
                        <span className="text-gray-300">•</span>
                        <span>{phase}3: <strong className="text-gray-800 font-semibold">{(sensors[2]*1000).toFixed(0)}</strong></span>
                      </div>
                      <div className="text-right pt-1.5 border-t border-gray-200/60">
                        Max (<strong className="text-gray-800 font-semibold">{maxSensorName}</strong>): <strong className="text-gray-900 font-bold">{maxSensorValue.toFixed(0)}</strong>
                      </div>
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
            {(() => {
              const status = device.latest_prediction?.rf_status || 'Normal'
              const conf = device.latest_prediction?.confidence
              const action = device.latest_prediction?.action || 'Pola konsumsi energi normal, tidak terdeteksi anomali.'
              
              const isCrit = status === 'Critical'
              const isWarn = status === 'Warning'
              
              const mainBg = isCrit ? 'bg-red-50 border-red-200' : isWarn ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
              const iconBg = isCrit ? 'bg-red-100' : isWarn ? 'bg-yellow-100' : 'bg-green-50'
              const iconColor = isCrit ? 'text-red-600' : isWarn ? 'text-yellow-600' : 'text-green-600'
              const textColor = isCrit ? 'text-red-800' : isWarn ? 'text-yellow-800' : 'text-green-800'
              const boxBg = isCrit ? 'bg-red-100/50 border-red-200' : isWarn ? 'bg-yellow-100/50 border-yellow-200' : 'bg-green-50 border-green-100'
              const pulse = isCrit ? 'animate-pulse' : ''

              return (
                <div className={`rounded-xl p-5 border shadow-sm flex-1 flex flex-col justify-center transition-colors duration-500 ${mainBg} ${pulse}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg ${iconBg}`}>
                        <Zap size={20} className={iconColor} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 leading-tight">Random Forest<br/>Analysis</span>
                    </div>
                    {conf && (
                      <div className="text-right">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">Confidence</span>
                        <span className={`text-lg font-black ${iconColor}`}>{conf}%</span>
                      </div>
                    )}
                  </div>
                  <div className={`rounded-lg p-3 border ${boxBg}`}>
                    <p className={`text-sm font-bold mb-1 ${textColor}`}>{status}</p>
                    <p className="text-xs text-gray-700 leading-relaxed font-medium">{action}</p>
                  </div>
                </div>
              )
            })()}
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
            <div className="space-y-2">
              {renderChart(`Tren Arus Bocor EMA (Average RST) (mA)`, [
                {key: 'R', color: '#ef4444', name: 'Average R'},
                {key: 'S', color: '#d97706', name: 'Average S'},
                {key: 'T', color: '#3b82f6', name: 'Average T'}
              ])}
              
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {renderChart(`Grafik Fasa R (mA)`, [
                  {key: 'r1', color: '#ef4444', name: 'R1'},
                  {key: 'r2', color: '#f87171', name: 'R2'},
                  {key: 'r3', color: '#fca5a5', name: 'R3'}
                ], 'syncGraph')}
                
                {renderChart(`Grafik Fasa S (mA)`, [
                  {key: 's1', color: '#d97706', name: 'S1'},
                  {key: 's2', color: '#f59e0b', name: 'S2'},
                  {key: 's3', color: '#fbbf24', name: 'S3'}
                ], 'syncGraph')}
                
                {renderChart(`Grafik Fasa T (mA)`, [
                  {key: 't1', color: '#3b82f6', name: 'T1'},
                  {key: 't2', color: '#60a5fa', name: 'T2'},
                  {key: 't3', color: '#93c5fd', name: 'T3'}
                ], 'syncGraph')}
              </div>
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
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg R (mA)</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg S (mA)</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Avg T (mA)</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {chartData.map((d: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{d.date} {d.time}</td>
                        <td className="px-6 py-3 text-right font-medium text-red-600">{d.R}</td>
                        <td className="px-6 py-3 text-right font-medium text-yellow-600">{d.S}</td>
                        <td className="px-6 py-3 text-right font-medium text-blue-600">{d.T}</td>
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
