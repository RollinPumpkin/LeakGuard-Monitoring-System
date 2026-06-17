'use client'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Device, SensorReading, DeviceWithLatest,
  TrafoConfig, ThresholdConfig, TrafoStatus, PhaseReading,
} from '@/types'
import { SystemStatusBar } from '@/components/SystemStatusBar'
import { ThresholdPanel } from '@/components/ThresholdPanel'
import { TrafoCard } from '@/components/TrafoCard'
import { TrendChart } from '@/components/TrendChart'
import { SummaryTable } from '@/components/SummaryTable'
import { Zap, RefreshCw } from 'lucide-react'

const LS_NAMES = 'leakguard_trafo_names'
const LS_THRESHOLD = 'leakguard_threshold'
const MAX_READINGS = 50

const CHANNEL_MAP: Omit<TrafoConfig, 'name'>[] = [
  { rChannel: 'ch1_mA', sChannel: 'ch4_mA', tChannel: 'ch7_mA',
    rBase: 'base1_mA', sBase: 'base4_mA', tBase: 'base7_mA' },
  { rChannel: 'ch2_mA', sChannel: 'ch5_mA', tChannel: 'ch8_mA',
    rBase: 'base2_mA', sBase: 'base5_mA', tBase: 'base8_mA' },
  { rChannel: 'ch3_mA', sChannel: 'ch6_mA', tChannel: 'ch9_mA',
    rBase: 'base3_mA', sBase: 'base6_mA', tBase: 'base9_mA' },
]

function loadNames(): string[] {
  try {
    const saved = localStorage.getItem(LS_NAMES)
    if (saved) {
      const arr = JSON.parse(saved) as string[]
      if (arr.length === 3) return arr
    }
  } catch { /* ignore */ }
  return ['Trafo 1', 'Trafo 2', 'Trafo 3']
}

function loadThreshold(): number {
  try {
    const v = parseFloat(localStorage.getItem(LS_THRESHOLD) ?? '')
    if (v > 0) return v
  } catch { /* ignore */ }
  return 0.1
}

function buildTrafoStatuses(
  reading: SensorReading | null,
  configs: TrafoConfig[],
  threshold: number,
): TrafoStatus[] {
  return configs.map(cfg => {
    const rv = reading ? Number(reading[cfg.rChannel] ?? 0) : 0
    const sv = reading ? Number(reading[cfg.sChannel] ?? 0) : 0
    const tv = reading ? Number(reading[cfg.tChannel] ?? 0) : 0
    const rb = reading ? Number(reading[cfg.rBase] ?? 0) : 0
    const sb = reading ? Number(reading[cfg.sBase] ?? 0) : 0
    const tb = reading ? Number(reading[cfg.tBase] ?? 0) : 0
    const phases: PhaseReading[] = [
      { phase: 'R', value: rv, baseline: rb, status: rv >= threshold ? 'Warning' : 'Normal' },
      { phase: 'S', value: sv, baseline: sb, status: sv >= threshold ? 'Warning' : 'Normal' },
      { phase: 'T', value: tv, baseline: tb, status: tv >= threshold ? 'Warning' : 'Normal' },
    ]
    return {
      config: cfg,
      phases,
      avgCurrent: (rv + sv + tv) / 3,
      overallStatus: phases.some(p => p.status === 'Warning') ? 'Warning' : 'Normal',
    }
  })
}

export default function DashboardPage() {
  const [devices, setDevices]         = useState<Device[]>([])
  const [activeDevId, setActiveDevId] = useState<string>('')
  const [readings, setReadings]       = useState<SensorReading[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [isLive, setIsLive]           = useState(false)
  const [names, setNames]             = useState<string[]>(['Trafo 1', 'Trafo 2', 'Trafo 3'])
  const [threshold, setThreshold]     = useState<ThresholdConfig>({ warning: 0.1 })

  useEffect(() => {
    setNames(loadNames())
    setThreshold({ warning: loadThreshold() })
  }, [])

  const trafoConfigs = useMemo<TrafoConfig[]>(
    () => CHANNEL_MAP.map((ch, i) => ({ ...ch, name: names[i] })),
    [names],
  )

  useEffect(() => {
    supabase
      .from('devices')
      .select('*')
      .eq('is_active', true)
      .order('device_id')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setDevices(data)
          setActiveDevId(data[0].device_id)
        }
      })
  }, [])

  const loadReadings = useCallback(async (devId: string) => {
    if (!devId) return
    setLoading(true)
    setError(null)
    const { data, error: dbErr } = await supabase
      .from('sensor_readings')
      .select('*')
      .eq('device_id', devId)
      .order('timestamp', { ascending: false })
      .limit(MAX_READINGS)
    if (dbErr) {
      setError(dbErr.message)
    } else if (data) {
      setReadings(data.reverse() as SensorReading[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (activeDevId) loadReadings(activeDevId)
  }, [activeDevId, loadReadings])

  useEffect(() => {
    if (!activeDevId) return
    const channel = supabase
      .channel(`readings:${activeDevId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings',
          filter: `device_id=eq.${activeDevId}` },
        payload => {
          const newRow = payload.new as SensorReading
          setReadings(prev => {
            const next = [...prev, newRow]
            return next.length > MAX_READINGS ? next.slice(-MAX_READINGS) : next
          })
        },
      )
      .subscribe(status => {
        setIsLive(status === 'SUBSCRIBED')
      })
    return () => { supabase.removeChannel(channel) }
  }, [activeDevId])

  const handleNameChange = (index: number, name: string) => {
    const next = names.map((n, i) => (i === index ? name : n))
    setNames(next)
    localStorage.setItem(LS_NAMES, JSON.stringify(next))
  }

  const handleThresholdChange = (t: ThresholdConfig) => {
    setThreshold(t)
    localStorage.setItem(LS_THRESHOLD, String(t.warning))
  }

  const latestReading = readings.length > 0 ? readings[readings.length - 1] : null

  const trafoStatuses: TrafoStatus[] = useMemo(
    () => buildTrafoStatuses(latestReading, trafoConfigs, threshold.warning),
    [latestReading, trafoConfigs, threshold.warning],
  )

  const activeDevice = useMemo<DeviceWithLatest | null>(() => {
    const dev = devices.find(d => d.device_id === activeDevId) ?? null
    if (!dev) return null
    return { ...dev, latest_reading: latestReading, latest_prediction: null }
  }, [devices, activeDevId, latestReading])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-6 py-4
        flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center
            justify-center">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">LeakGuard</h1>
            <p className="text-xs text-gray-400">
              Monitoring Arus Bocor Multichannel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {devices.length > 1 && (
            <select
              value={activeDevId}
              onChange={e => setActiveDevId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {devices.map(d => (
                <option key={d.device_id} value={d.device_id}>
                  {d.device_id}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => loadReadings(activeDevId)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm
              border border-gray-200 rounded-lg hover:bg-gray-50
              disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">

        {/* System status bar */}
        <SystemStatusBar device={activeDevice} isLive={isLive} />

        {/* Threshold config panel */}
        <ThresholdPanel threshold={threshold} onChange={handleThresholdChange} />

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3
            flex items-center justify-between">
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={() => loadReadings(activeDevId)}
              className="text-xs text-red-600 underline hover:no-underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && readings.length === 0 && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent
                rounded-full animate-spin" />
              <span className="text-sm text-gray-400">
                Memuat data sensor...
              </span>
            </div>
          </div>
        )}

        {/* Trafo cards — 3 columns */}
        {!loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {trafoStatuses.map((ts, i) => (
                <TrafoCard
                  key={i}
                  trafoStatus={ts}
                  onNameChange={name => handleNameChange(i, name)}
                  threshold={threshold}
                />
              ))}
            </div>

            {/* Summary table */}
            <SummaryTable trafos={trafoStatuses} />

            {/* Trend chart */}
            <TrendChart
              readings={readings}
              configs={trafoConfigs}
              threshold={threshold}
            />
          </>
        )}
      </main>
    </div>
  )
}
